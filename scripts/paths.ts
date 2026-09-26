import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Absolute directory of an installed npm package. Looked up directly in
 * node_modules because some packages don't expose `package.json` via `exports`.
 */
export function packageDir(name: string): string {
  return path.join(projectRoot, 'node_modules', name);
}

/**
 * Feature gates that must stay closed outside the platform.
 * `enableComboboxElementInternals` makes lightning-combobox call `attachInternals()`,
 * which throws under synthetic shadow (see docs/decisions.md).
 */
export const closedGates = ['@salesforce/gate/bc.260.enableComboboxElementInternals'];

export const gateClosedStub = path.join(projectRoot, 'scripts/shims/gate-closed.js');
