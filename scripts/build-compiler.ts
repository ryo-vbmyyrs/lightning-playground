// Bundles src/worker/compiler.worker.ts (which wraps @lwc/compiler) into a browser
// module worker. @lwc/compiler targets Node, so Node built-ins are aliased to
// browser polyfills or no-op shims. Output: public/generated/compiler.worker.js
import path from 'node:path';
import { build } from 'esbuild';
import { projectRoot } from './paths.ts';

const emptyShim = path.join(projectRoot, 'scripts/shims/node-empty.cjs');
const emptyModules = ['assert', 'fs', 'module', 'os', 'process', 'url', 'v8'];

const alias: Record<string, string> = {
  path: 'path-browserify',
  'node:path': 'path-browserify',
  util: 'util',
  'node:util': 'util',
};
for (const name of emptyModules) {
  alias[name] = emptyShim;
  alias[`node:${name}`] = emptyShim;
}

const outfile = path.join(projectRoot, 'public/generated/compiler.worker.js');

await build({
  entryPoints: [path.join(projectRoot, 'src/worker/compiler.worker.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'external',
  alias,
  inject: [path.join(projectRoot, 'scripts/shims/buffer-global.js')],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  banner: {
    js: 'globalThis.process ??= { env: {}, cwd: () => "/", platform: "browser", emitWarning() {} };',
  },
  logLevel: 'warning',
});

console.log(`compiler: ${path.relative(projectRoot, outfile)}`);
