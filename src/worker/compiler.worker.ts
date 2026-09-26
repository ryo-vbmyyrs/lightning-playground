// Compiles an LWC bundle (html/js/css files) in the browser and returns ES modules
// keyed by the import-map specifier the preview iframe will use.
// Bundled by scripts/build-compiler.ts, not by Vite.
import { transformSync } from '@lwc/compiler';
import type { CompileError, CompileRequest, CompileResponse, SourceFile } from '../shared/types';

declare const self: DedicatedWorkerGlobalScope;

const EMPTY_TEMPLATE = 'export default void 0;\n';
const EMPTY_STYLESHEET = 'export default undefined;\n';

/**
 * Specifier of a file inside the bundle. The main JS file is the bundle itself (`x/app`);
 * other JS files drop their extension (`x/app/helper`) to match how LWC code imports them.
 */
function specifierFor(namespace: string, bundle: string, fileName: string): string {
  if (fileName === `${bundle}.js`) return `${namespace}/${bundle}`;
  return `${namespace}/${bundle}/${fileName.replace(/\.js$/, '')}`;
}

/** Rewrites `./foo` imports to bundle specifiers so they resolve through the import map. */
function rewriteRelativeImports(code: string, namespace: string, bundle: string): string {
  return code.replace(
    /(\bfrom\s*|\bimport\s*\(?\s*)(["'])\.\/([^"']+)\2/g,
    (_match, prefix: string, quote: string, target: string) =>
      `${prefix}${quote}${specifierFor(namespace, bundle, target)}${quote}`,
  );
}

function toCompileError(file: string, error: unknown): CompileError {
  const err = error as { message?: string; location?: { line?: number; column?: number } };
  return {
    file,
    message: err.message ?? String(error),
    line: err.location?.line,
    column: err.location?.column,
  };
}

function compile({ id, namespace, name, files }: CompileRequest): CompileResponse {
  const modules: Record<string, string> = {};
  const errors: CompileError[] = [];

  const compileFile = (file: SourceFile, specifier: string, scopedStyles = false) => {
    try {
      const { code } = transformSync(file.content, `${namespace}/${name}/${file.name}`, {
        namespace,
        name,
        scopedStyles,
        // Match the platform, which allows `lwc:is` (dynamic components).
        enableDynamicComponents: true,
      });
      modules[specifier] = rewriteRelativeImports(code, namespace, name);
    } catch (error) {
      errors.push(toCompileError(file.name, error));
    }
  };

  for (const file of files) {
    if (file.name === `${name}.scoped.css`) {
      compileFile(file, `${namespace}/${name}/${name}.scoped.css?scoped=true`, true);
    } else {
      compileFile(file, specifierFor(namespace, name, file.name));
    }
  }

  // The compiled template/class always import these implicit files; provide empty modules when absent.
  modules[`${namespace}/${name}/${name}.html`] ??= EMPTY_TEMPLATE;
  modules[`${namespace}/${name}/${name}.css`] ??= EMPTY_STYLESHEET;
  modules[`${namespace}/${name}/${name}.scoped.css?scoped=true`] ??= EMPTY_STYLESHEET;

  if (!files.some((file) => file.name === `${name}.js`)) {
    errors.push({ file: `${name}.js`, message: 'The bundle needs a main JavaScript file.' });
  }
  return errors.length > 0 ? { id, ok: false, errors } : { id, ok: true, modules };
}

self.addEventListener('message', (event: MessageEvent<CompileRequest>) => {
  self.postMessage(compile(event.data));
});
