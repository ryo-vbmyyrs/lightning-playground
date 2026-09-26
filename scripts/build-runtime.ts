// Prebuilds the LWC runtime that the preview iframe loads:
//   - `lwc` (engine), `@lwc/synthetic-shadow` and every `lightning/*` module as separate ES module entries
//   - an import map manifest pointing at those entries
//   - the SLDS stylesheet and images
// Output: public/generated/runtime/, public/generated/slds/
// See docs/architecture.md and docs/decisions.md for why it is built this way.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { rollup, type Plugin, type RollupLog } from 'rollup';
import lwc from '@lwc/rollup-plugin';
import replace from '@rollup/plugin-replace';
import type { RuntimeManifest } from '../src/shared/types.ts';
import { closedGates, gateClosedStub, packageDir, projectRoot } from './paths.ts';

const entriesDir = path.join(projectRoot, '.generated/runtime-entries');
const runtimeOutDir = path.join(projectRoot, 'public/generated/runtime');
const sldsOutDir = path.join(projectRoot, 'public/generated/slds');
const lbcDir = packageDir('lightning-base-components');
const sldsDir = packageDir('@salesforce-ux/design-system');

/**
 * Writes one tiny entry file per public module so Rollup emits a stable,
 * importable file for it. The entries live inside the project so the LWC
 * module resolver treats them exactly like application code.
 */
async function writeEntries(): Promise<Record<string, string>> {
  await rm(entriesDir, { recursive: true, force: true });
  await mkdir(path.join(entriesDir, 'lightning'), { recursive: true });

  const input: Record<string, string> = {};
  const addEntry = async (name: string, source: string) => {
    const file = path.join(entriesDir, `${name}.js`);
    await writeFile(file, source);
    input[name] = file;
  };

  await addEntry('lwc', "export * from 'lwc';\n");
  await addEntry('synthetic-shadow', "import '@lwc/synthetic-shadow';\n");

  // Only modules listed in the package's `lwc.expose` may be imported from outside the
  // package; the LWC resolver refuses the private ones (primitive*, *Utils, ...).
  const pkg = JSON.parse(await readFile(path.join(lbcDir, 'package.json'), 'utf8')) as { lwc: { expose: string[] } };
  for (const specifier of [...pkg.lwc.expose].sort()) {
    const name = specifier.slice('lightning/'.length);
    const mainFile = path.join(lbcDir, 'src/lightning', name, `${name}.js`);
    // Some modules only hold CSS (e.g. sldsUtils*) and cannot be JS entries.
    if (!existsSync(mainFile)) continue;
    const source = await readFile(mainFile, 'utf8');
    const hasDefault = /export\s+default\b|\bas\s+default\b/.test(source);
    await addEntry(
      specifier,
      `export * from '${specifier}';\n` + (hasDefault ? `export { default } from '${specifier}';\n` : ''),
    );
  }
  return input;
}

/** Forces specific `@salesforce/gate/*` imports to a closed gate (the package stubs every gate as open). */
function gateOverride(): Plugin {
  return {
    name: 'gate-override',
    resolveId(id) {
      return closedGates.includes(id) ? gateClosedStub : null;
    },
  };
}

async function buildRuntime(): Promise<void> {
  const input = await writeEntries();
  await rm(runtimeOutDir, { recursive: true, force: true });

  const warningCounts = new Map<string, number>();
  const bundle = await rollup({
    input,
    preserveEntrySignatures: 'strict',
    onwarn(warning: RollupLog) {
      const key = warning.plugin ? `${warning.plugin}: ${warning.code ?? ''}` : (warning.code ?? 'UNKNOWN');
      warningCounts.set(key, (warningCounts.get(key) ?? 0) + 1);
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          // Development mode keeps LWC's helpful runtime warnings, which is what a playground wants.
          'process.env.NODE_ENV': JSON.stringify('development'),
          // lightning-base-components expects a Vite-style env flag.
          'import.meta.env.SSR': 'false',
        },
      }),
      gateOverride(),
      lwc({
        rootDir: projectRoot,
        modules: [{ npm: 'lightning-base-components' }],
        // The plugin's default list also includes @lwc/wire-service, which the base
        // components don't use; leaving it out avoids an extra dependency.
        defaultModules: [{ npm: '@lwc/engine-dom' }, { npm: '@lwc/synthetic-shadow' }],
        // Some modules (e.g. multiColumnSortingModal) use `lwc:is`, as the platform allows.
        enableDynamicComponents: true,
      }),
    ],
  });

  const { output } = await bundle.write({
    dir: runtimeOutDir,
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
  });
  await bundle.close();

  const manifest: RuntimeManifest = { imports: {} };
  for (const chunk of output) {
    if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
    const specifier = chunk.name === 'synthetic-shadow' ? '@lwc/synthetic-shadow' : chunk.name;
    manifest.imports[specifier] = chunk.fileName;
  }
  await writeFile(path.join(runtimeOutDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  for (const [key, count] of warningCounts) console.warn(`  warning x${count}: ${key}`);
  console.log(`runtime: ${Object.keys(manifest.imports).length} entries -> ${path.relative(projectRoot, runtimeOutDir)}`);
}

async function copySlds(): Promise<void> {
  await rm(sldsOutDir, { recursive: true, force: true });
  const stylesheet = 'styles/salesforce-lightning-design-system.min.css';
  await mkdir(path.join(sldsOutDir, 'styles'), { recursive: true });
  await cp(path.join(sldsDir, 'assets', stylesheet), path.join(sldsOutDir, stylesheet));
  // The stylesheet references ../images/*; icons are inlined by the base components, so assets/icons is skipped.
  await cp(path.join(sldsDir, 'assets/images'), path.join(sldsOutDir, 'images'), { recursive: true });
  console.log(`slds: copied -> ${path.relative(projectRoot, sldsOutDir)}`);
}

await buildRuntime();
await copySlds();
