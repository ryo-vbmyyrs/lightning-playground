import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Catalog, CompileError, RuntimeManifest, SourceFile } from '../shared/types';
import { loadCatalog, loadRuntimeManifest } from './lib/assets';
import { CompilerClient } from './lib/compilerClient';
import { buildPreviewDocument } from './lib/previewDocument';
import { Sidebar, type Selection } from './components/Sidebar';
import { CodeEditor } from './components/CodeEditor';
import { PreviewFrame } from './components/PreviewFrame';
import { ConsolePanel, type ConsoleEntry } from './components/ConsolePanel';
import { ComponentInfo } from './components/ComponentInfo';

const NAMESPACE = 'x';
const COMPILE_DELAY_MS = 500;
const DEFAULT_COMPONENT = 'input';

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [runtime, setRuntime] = useState<RuntimeManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [compileErrors, setCompileErrors] = useState<CompileError[]>([]);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);

  const [compiler, setCompiler] = useState<CompilerClient | null>(null);
  useEffect(() => {
    const client = new CompilerClient();
    setCompiler(client);
    return () => client.dispose();
  }, []);

  const component = useMemo(
    () => catalog?.components.find((c) => c.name === selection?.component) ?? null,
    [catalog, selection],
  );
  const example = useMemo(
    () => component?.examples.find((e) => e.name === selection?.example) ?? null,
    [component, selection],
  );

  const selectExample = useCallback((next: Selection) => {
    setSelection(next);
    setActiveFile(0);
  }, []);

  // Load the prebuilt catalog and runtime manifest once.
  useEffect(() => {
    Promise.all([loadCatalog(), loadRuntimeManifest()])
      .then(([loadedCatalog, loadedRuntime]) => {
        setCatalog(loadedCatalog);
        setRuntime(loadedRuntime);
        const initial =
          loadedCatalog.components.find((c) => c.name === DEFAULT_COMPONENT) ?? loadedCatalog.components[0];
        if (initial?.examples[0]) selectExample({ component: initial.name, example: initial.examples[0].name });
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : String(error)));
  }, [selectExample]);

  // Reset the editable files whenever another example is picked.
  useEffect(() => {
    setFiles(example ? example.files.map((file) => ({ ...file })) : []);
  }, [example]);

  // Recompile (debounced) whenever the sources change.
  useEffect(() => {
    if (!compiler || !runtime || !example || files.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      compiler.compile({ namespace: NAMESPACE, name: example.name, files }).then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setCompileErrors([]);
          setLogs([]);
          setPreviewHtml(
            buildPreviewDocument({ runtime, modules: result.modules, namespace: NAMESPACE, bundleName: example.name }),
          );
        } else {
          setCompileErrors(result.errors);
        }
      });
    }, COMPILE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [compiler, runtime, example, files]);

  const updateFile = useCallback((index: number, content: string) => {
    setFiles((current) => current.map((file, i) => (i === index ? { ...file, content } : file)));
  }, []);

  const resetFiles = useCallback(() => {
    if (example) setFiles(example.files.map((file) => ({ ...file })));
  }, [example]);

  const appendLog = useCallback((entry: ConsoleEntry) => setLogs((current) => [...current, entry]), []);

  if (loadError) {
    return (
      <div className="load-error">
        <h1>Lightning Playground</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <h1>Lightning Playground</h1>
        {catalog && <span className="header-meta">lightning-base-components {catalog.packageVersion}</span>}
      </header>
      <Sidebar components={catalog?.components ?? []} selection={selection} onSelect={selectExample} />
      <main className="editor-column">
        {component && <ComponentInfo component={component} />}
        <CodeEditor
          files={files}
          activeIndex={activeFile}
          onSelectFile={setActiveFile}
          onChange={updateFile}
          onReset={resetFiles}
        />
      </main>
      <section className="preview-column">
        <PreviewFrame html={previewHtml} onConsole={appendLog} />
        <ConsolePanel errors={compileErrors} logs={logs} />
      </section>
    </div>
  );
}
