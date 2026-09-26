// Types shared between the build scripts, the React app and the compiler worker.
// Keep this file free of imports so every environment can consume it as-is.

/** A single editable source file of an LWC bundle, e.g. `text.html`. */
export interface SourceFile {
  name: string;
  content: string;
}

/** One example shipped in `lightning-base-components/src/lightning/<component>/__examples__/<name>`. */
export interface Example {
  /** Folder name, which is also the LWC bundle name (e.g. `checkboxbasic`). */
  name: string;
  files: SourceFile[];
}

export interface ComponentProperty {
  name: string;
}

export interface CatalogComponent {
  /** Module name under the `lightning` namespace, e.g. `input` or `buttonIcon`. */
  name: string;
  /** Custom element tag, e.g. `lightning-input`. */
  tag: string;
  /** Support level on the Salesforce platform, from the component's `.js-meta.xml`. */
  support: 'GA' | 'BETA';
  properties: ComponentProperty[];
  slots: string[];
  examples: Example[];
}

/** Content of `public/generated/catalog.json`. */
export interface Catalog {
  packageVersion: string;
  components: CatalogComponent[];
}

/** Content of `public/generated/runtime/manifest.json`: an import map relative to `public/generated/runtime/`. */
export interface RuntimeManifest {
  imports: Record<string, string>;
}

export interface CompileRequest {
  id: number;
  /** LWC namespace of the bundle being edited (always `x` in the playground). */
  namespace: string;
  /** Bundle name, which is also the base name of its main `.js` / `.html` / `.css` files. */
  name: string;
  files: SourceFile[];
}

export interface CompileError {
  file: string;
  message: string;
  line?: number;
  column?: number;
}

export type CompileResponse =
  | {
      id: number;
      ok: true;
      /** Import map specifier (e.g. `x/app`, `x/app/app.html`) to compiled ES module source. */
      modules: Record<string, string>;
    }
  | { id: number; ok: false; errors: CompileError[] };

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

/** Messages posted from the preview iframe to the playground. */
export type PreviewMessage =
  | { source: 'lightning-playground-preview'; type: 'console'; level: ConsoleLevel; text: string }
  | { source: 'lightning-playground-preview'; type: 'ready' };
