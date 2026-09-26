import type { Catalog, RuntimeManifest } from '../../shared/types';

/** Absolute URL of a file produced by `npm run assets` (served from public/generated). */
export function generatedUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}generated/${path}`, window.location.href).href;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(generatedUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status}). Did you run \`npm run assets\`?`);
  }
  return (await response.json()) as T;
}

export const loadCatalog = () => fetchJson<Catalog>('catalog.json');
export const loadRuntimeManifest = () => fetchJson<RuntimeManifest>('runtime/manifest.json');
