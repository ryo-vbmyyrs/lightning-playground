// Tracks which npm packages end up in the files the site serves, and turns that list into
// THIRD_PARTY_NOTICES.txt (license texts that must ship with the built site).
// Each asset build records the packages it bundled; the Vite build adds the app bundle's
// packages and emits the notices into dist/. See docs/dependencies.md.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './paths.ts';

const recordDir = path.join(projectRoot, '.generated/bundled-packages');

/** License files for packages that don't ship their own (the build fails if one is missing). */
const vendoredLicenses: Record<string, string[]> = {
  // Copied verbatim from https://github.com/salesforce-ux/licenses, which the package README links to.
  '@salesforce-ux/design-system': [
    'scripts/licenses/salesforce-ux-design-system/LICENSE.txt',
    'scripts/licenses/salesforce-ux-design-system/LICENSE-icons-images.txt',
  ],
  // The license section of the package README (isarray@1.0.0).
  isarray: ['scripts/licenses/isarray/LICENSE'],
};

/** Extra lines printed above a package's license texts. */
const packageNotes: Record<string, string> = {
  '@salesforce-ux/design-system':
    'Source code (CSS) is licensed under the BSD 3-Clause license.\n' +
    'Icons and images (served unmodified under slds/images/) are licensed under\n' +
    'Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0),\n' +
    'https://creativecommons.org/licenses/by-nd/4.0/. Copyright Salesforce, Inc.',
};

const licenseFilePattern = /^(licen[cs]e|copying|notice)([.-].*)?$/i;

/** Package directories (relative to the project root) that the given module paths belong to. */
export function packageDirsOf(moduleIds: Iterable<string>): string[] {
  const dirs = new Set<string>();
  for (const id of moduleIds) {
    // Rollup marks virtual modules with \0 and plugins may append ?query suffixes.
    const file = path.resolve(projectRoot, id.replace(/^\0/, '').replace(/\?.*$/, ''));
    const marker = `${path.sep}node_modules${path.sep}`;
    const index = file.lastIndexOf(marker);
    if (index === -1) continue;
    const segments = file.slice(index + marker.length).split(path.sep);
    const name = segments[0].startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
    dirs.add(path.relative(projectRoot, file.slice(0, index + marker.length) + name));
  }
  return [...dirs].sort();
}

/** Records the packages that one generated asset bundles or copies. */
export async function recordBundledPackages(asset: string, moduleIds: Iterable<string>): Promise<void> {
  await mkdir(recordDir, { recursive: true });
  await writeFile(path.join(recordDir, `${asset}.json`), JSON.stringify(packageDirsOf(moduleIds), null, 2));
}

async function readRecordedPackageDirs(): Promise<string[]> {
  if (!existsSync(recordDir)) throw new Error('No bundled package records found. Run `npm run assets` first.');
  const dirs: string[] = [];
  for (const file of await readdir(recordDir)) {
    dirs.push(...(JSON.parse(await readFile(path.join(recordDir, file), 'utf8')) as string[]));
  }
  return dirs;
}

async function licenseFilesOf(name: string, dir: string): Promise<string[]> {
  const vendored = vendoredLicenses[name];
  if (vendored) return vendored.map((file) => path.join(projectRoot, file));
  const files = (await readdir(dir)).filter((file) => licenseFilePattern.test(file)).sort();
  if (files.length === 0) {
    throw new Error(`${name} ships no license file; add it to vendoredLicenses in scripts/licenses.ts.`);
  }
  return files.map((file) => path.join(dir, file));
}

/**
 * Builds THIRD_PARTY_NOTICES.txt for every recorded package plus `extraModuleIds`
 * (the modules of the app bundle itself).
 */
export async function buildThirdPartyNotices(extraModuleIds: Iterable<string>): Promise<string> {
  const dirs = new Set([...(await readRecordedPackageDirs()), ...packageDirsOf(extraModuleIds)]);

  const entries = new Map<string, { license: string; texts: string[]; name: string }>();
  for (const relativeDir of dirs) {
    const dir = path.join(projectRoot, relativeDir);
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as {
      name: string;
      version: string;
      license?: string;
    };
    const key = `${pkg.name}@${pkg.version}`;
    if (entries.has(key)) continue;
    const texts = await Promise.all((await licenseFilesOf(pkg.name, dir)).map((file) => readFile(file, 'utf8')));
    entries.set(key, { name: pkg.name, license: pkg.license ?? 'UNKNOWN', texts });
  }

  const rule = '='.repeat(80);
  const sections = [...entries]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { name, license, texts }]) => {
      const note = packageNotes[name] ? `${packageNotes[name]}\n\n` : '';
      return `${rule}\n${key} (package.json license: ${license})\n${rule}\n\n${note}${texts.map((text) => text.trim()).join('\n\n' + '-'.repeat(80) + '\n\n')}\n`;
    });

  return (
    'THIRD-PARTY NOTICES\n\n' +
    'Lightning Playground bundles or serves the third-party software listed below.\n' +
    'Each is provided under its own license, reproduced in full here. Lightning Playground\n' +
    'is not affiliated with or endorsed by Salesforce, Inc.; Salesforce, Lightning and\n' +
    'related marks are trademarks of Salesforce, Inc.\n\n' +
    `Packages: ${entries.size}\n\n` +
    sections.join('\n')
  );
}
