import type { RuntimeManifest } from '../../shared/types';
import { generatedUrl } from './assets';

export const PREVIEW_MESSAGE_SOURCE = 'lightning-playground-preview';

/** `checkboxBasic` -> `checkbox-basic`, used for the root element tag (`x-checkbox-basic`). */
export function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

const toDataUrl = (code: string) => `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;

/** JSON that is safe to embed inside a <script> element. */
const scriptSafeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Forwards console output and uncaught errors to the playground (runs inside the iframe). */
const consoleBridge = `
(() => {
  const source = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
  const format = (value) => {
    if (value instanceof Error) return value.stack || String(value);
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  const send = (level, args) => parent.postMessage({ source, type: 'console', level, text: args.map(format).join(' ') }, '*');
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => { send(level, args); original(...args); };
  }
  addEventListener('error', (event) => send('error', [event.error ?? event.message]));
  addEventListener('unhandledrejection', (event) => send('error', [event.reason]));
})();
`;

export interface PreviewDocumentOptions {
  runtime: RuntimeManifest;
  /** Compiled user modules keyed by specifier (from the compiler worker). */
  modules: Record<string, string>;
  namespace: string;
  bundleName: string;
}

/**
 * Builds the `srcdoc` of the preview iframe. Every run gets a fresh document, so the
 * custom element registry and the LWC engine start clean each time.
 */
export function buildPreviewDocument({ runtime, modules, namespace, bundleName }: PreviewDocumentOptions): string {
  const imports: Record<string, string> = {};
  for (const [specifier, file] of Object.entries(runtime.imports)) {
    imports[specifier] = generatedUrl(`runtime/${file}`);
  }
  for (const [specifier, code] of Object.entries(modules)) {
    imports[specifier] = toDataUrl(code);
  }

  const tagName = `${namespace}-${toKebabCase(bundleName)}`;
  const bootstrap = `
try {
  // Synthetic shadow must patch the DOM before the engine creates any component.
  await import('@lwc/synthetic-shadow');
  const { createElement } = await import('lwc');
  const { default: Component } = await import(${JSON.stringify(`${namespace}/${bundleName}`)});
  document.getElementById('root').appendChild(createElement(${JSON.stringify(tagName)}, { is: Component }));
} catch (error) {
  console.error(error);
}
parent.postMessage({ source: ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)}, type: 'ready' }, '*');
`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${generatedUrl('slds/styles/salesforce-lightning-design-system.min.css')}">
<style>
  /* SLDS paints the page background light blue; the preview should look like a plain page. */
  html, body { background: #fff; }
  body { margin: 0; padding: 1rem; }
  /* Background used by the Component Library examples. */
  .lgc-bg { background: #fff; border: 1px solid #e5e5e5; border-radius: 0.25rem; }
  .lgc-bg-inverse { background: #16325c; border-radius: 0.25rem; }
</style>
<script type="importmap">${scriptSafeJson({ imports })}</script>
<script>${consoleBridge}</script>
</head>
<body>
<div id="root"></div>
<script type="module">${bootstrap}</script>
</body>
</html>`;
}
