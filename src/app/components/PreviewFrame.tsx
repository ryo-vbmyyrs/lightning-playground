import { useEffect, useRef } from 'react';
import type { PreviewMessage } from '../../shared/types';
import { PREVIEW_MESSAGE_SOURCE } from '../lib/previewDocument';
import type { ConsoleEntry } from './ConsolePanel';

interface PreviewFrameProps {
  html: string | null;
  onConsole: (entry: ConsoleEntry) => void;
}

export function PreviewFrame({ html, onConsole }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source !== PREVIEW_MESSAGE_SOURCE || event.data.type !== 'console') return;
      onConsole({ level: event.data.level, text: event.data.text });
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsole]);

  return (
    <div className="preview">
      {html === null ? (
        <p className="preview-placeholder">Compiling…</p>
      ) : (
        // Not sandboxed: the preview needs the playground's origin to load the runtime.
        // Acceptable because it only runs code typed by the current user (docs/decisions.md).
        <iframe ref={iframeRef} className="preview-frame" title="Preview" srcDoc={html} />
      )}
    </div>
  );
}
