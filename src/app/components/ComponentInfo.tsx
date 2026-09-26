import type { CatalogComponent } from '../../shared/types';

/** Property and slot names from lightning-base-components/metadata/raptor.json. */
export function ComponentInfo({ component }: { component: CatalogComponent }) {
  return (
    <details className="component-info">
      <summary>
        <code>&lt;{component.tag}&gt;</code> — {component.properties.length} properties, {component.slots.length} slots
      </summary>
      <dl>
        <dt>Properties</dt>
        <dd>{component.properties.map((p) => p.name).join(', ') || '—'}</dd>
        <dt>Slots</dt>
        <dd>{component.slots.map((s) => (s === '' ? '(default)' : s)).join(', ') || '—'}</dd>
      </dl>
    </details>
  );
}
