import type { CompileError, ConsoleLevel } from '../../shared/types';

export interface ConsoleEntry {
  level: ConsoleLevel;
  text: string;
}

interface ConsolePanelProps {
  errors: CompileError[];
  logs: ConsoleEntry[];
}

function formatLocation(error: CompileError): string {
  if (error.line === undefined) return error.file;
  return `${error.file}:${error.line}${error.column === undefined ? '' : `:${error.column}`}`;
}

export function ConsolePanel({ errors, logs }: ConsolePanelProps) {
  return (
    <div className="console">
      <div className="console-title">Console</div>
      <ul className="console-lines">
        {errors.map((error, index) => (
          <li key={`e${index}`} className="console-line level-error">
            <strong>Compile error</strong> {formatLocation(error)} — {error.message}
          </li>
        ))}
        {logs.map((entry, index) => (
          <li key={`l${index}`} className={`console-line level-${entry.level}`}>
            {entry.text}
          </li>
        ))}
        {errors.length === 0 && logs.length === 0 && <li className="console-empty">No output</li>}
      </ul>
    </div>
  );
}
