// Builds public/generated/catalog.json: the list of platform-supported components that ship examples,
// their examples' source files (the same ones the old Component Library playground used)
// and the property/slot names from metadata/raptor.json.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Catalog, CatalogComponent, Example, SourceFile } from '../src/shared/types.ts';
import { packageDir, projectRoot } from './paths.ts';

interface RaptorEntry {
  properties?: { name: string }[];
  slotNames?: string[];
}

const lbcDir = packageDir('lightning-base-components');
const outFile = path.join(projectRoot, 'public/generated/catalog.json');

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const pascal = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** Main bundle files first (html, js, css), helpers after. */
function fileOrder(exampleName: string, file: string): number {
  const order = ['.html', '.js', '.css'].indexOf(path.extname(file));
  return path.basename(file, path.extname(file)) === exampleName ? order : 10 + order;
}

async function readExample(dir: string, name: string): Promise<Example> {
  const names = (await readdir(dir)).filter(
    (file) => /\.(html|js|css)$/.test(file) && !file.endsWith('.d.ts'),
  );
  names.sort((a, b) => fileOrder(name, a) - fileOrder(name, b) || a.localeCompare(b));

  const files: SourceFile[] = [];
  for (const file of names) {
    files.push({ name: file, content: await readFile(path.join(dir, file), 'utf8') });
  }
  if (!files.some((file) => file.name === `${name}.js`)) {
    files.push({
      name: `${name}.js`,
      content: `import { LightningElement } from 'lwc';\n\nexport default class ${pascal(name)} extends LightningElement {}\n`,
    });
  }
  return { name, files };
}

/**
 * Support level declared in `<name>.js-meta.xml`. Components without `<support>` only work
 * outside the platform (e.g. lightning-dialog) and are left out, like in the Component Library.
 */
async function readSupport(name: string): Promise<CatalogComponent['support'] | null> {
  const metaFile = path.join(lbcDir, 'src/lightning', name, `${name}.js-meta.xml`);
  if (!existsSync(metaFile)) return null;
  const support = /<support>(\w+)<\/support>/.exec(await readFile(metaFile, 'utf8'))?.[1];
  return support === 'GA' || support === 'BETA' ? support : null;
}

async function buildCatalog(): Promise<void> {
  const pkg = JSON.parse(await readFile(path.join(lbcDir, 'package.json'), 'utf8')) as {
    version: string;
    lwc: { expose: string[] };
  };
  const exposed = new Set(pkg.lwc.expose);
  const raptor = JSON.parse(await readFile(path.join(lbcDir, 'metadata/raptor.json'), 'utf8')) as Record<
    string,
    RaptorEntry
  >;

  const components: CatalogComponent[] = [];
  const moduleNames = (await readdir(path.join(lbcDir, 'src/lightning'))).sort();
  for (const name of moduleNames) {
    const examplesDir = path.join(lbcDir, 'src/lightning', name, '__examples__');
    if (!existsSync(examplesDir) || !exposed.has(`lightning/${name}`)) continue;
    const support = await readSupport(name);
    if (!support) continue;

    const examples: Example[] = [];
    for (const exampleName of (await readdir(examplesDir)).sort()) {
      examples.push(await readExample(path.join(examplesDir, exampleName), exampleName));
    }
    const meta = raptor[name] ?? {};
    components.push({
      name,
      tag: `lightning-${kebab(name)}`,
      support,
      properties: (meta.properties ?? []).map((p) => ({ name: p.name })),
      slots: meta.slotNames ?? [],
      examples,
    });
  }

  const catalog: Catalog = { packageVersion: pkg.version, components };
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(catalog));
  const exampleCount = components.reduce((sum, c) => sum + c.examples.length, 0);
  console.log(`catalog: ${components.length} components, ${exampleCount} examples -> ${path.relative(projectRoot, outFile)}`);
}

await buildCatalog();
