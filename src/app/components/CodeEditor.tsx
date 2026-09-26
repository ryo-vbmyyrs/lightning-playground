import { useRef, type KeyboardEvent } from 'react';
import type { SourceFile } from '../../shared/types';

const INDENT = '    ';

interface CodeEditorProps {
  files: SourceFile[];
  activeIndex: number;
  onSelectFile: (index: number) => void;
  onChange: (index: number, content: string) => void;
  onReset: () => void;
}

/**
 * Minimal textarea-based editor. Intentionally dependency-free for the prototype;
 * see docs/decisions.md for the plan to move to a real code editor.
 */
export function CodeEditor({ files, activeIndex, onSelectFile, onChange, onReset }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const file = files[activeIndex];

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    onChange(activeIndex, value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd));
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(selectionStart + INDENT.length, selectionStart + INDENT.length);
    });
  };

  return (
    <div className="code-editor">
      <div className="tab-bar">
        {files.map((f, index) => (
          <button
            key={f.name}
            type="button"
            className={`tab${index === activeIndex ? ' is-active' : ''}`}
            onClick={() => onSelectFile(index)}
          >
            {f.name}
          </button>
        ))}
        <button type="button" className="tab-action" onClick={onReset} title="Restore the original example">
          Reset
        </button>
      </div>
      {file && (
        <textarea
          ref={textareaRef}
          className="code-textarea"
          spellCheck={false}
          value={file.content}
          onChange={(event) => onChange(activeIndex, event.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}
