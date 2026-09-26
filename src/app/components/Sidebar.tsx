import { useEffect, useRef, useState } from 'react';
import type { CatalogComponent } from '../../shared/types';

export interface Selection {
  component: string;
  example: string;
}

interface SidebarProps {
  components: CatalogComponent[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}

export function Sidebar({ components, selection, onSelect }: SidebarProps) {
  const [query, setQuery] = useState('');
  const openItemRef = useRef<HTMLButtonElement>(null);

  // Keep the selected component visible, e.g. the initial `lightning-input` further down the list.
  useEffect(() => {
    openItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selection?.component]);

  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? components.filter((c) => c.tag.includes(normalized) || c.name.toLowerCase().includes(normalized))
    : components;

  return (
    <nav className="sidebar">
      <input
        className="sidebar-search"
        type="search"
        placeholder="Filter components"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul className="component-list">
        {visible.map((component) => {
          const isOpen = component.name === selection?.component;
          return (
            <li key={component.name}>
              <button
                ref={isOpen ? openItemRef : undefined}
                type="button"
                className={`component-item${isOpen ? ' is-open' : ''}`}
                onClick={() => onSelect({ component: component.name, example: component.examples[0].name })}
              >
                {component.tag}
                {component.support === 'BETA' && <span className="badge">Beta</span>}
              </button>
              {isOpen && (
                <ul className="example-list">
                  {component.examples.map((example) => (
                    <li key={example.name}>
                      <button
                        type="button"
                        className={`example-item${example.name === selection?.example ? ' is-active' : ''}`}
                        onClick={() => onSelect({ component: component.name, example: example.name })}
                      >
                        {example.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
