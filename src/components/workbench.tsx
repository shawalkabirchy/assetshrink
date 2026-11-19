'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { byteLength, formatBytes, outputFilename, sizeChange } from '../lib/metrics';
import { EXAMPLE_NAME, EXAMPLE_SVG } from '../lib/example';
import { useWorkbench } from './use-workbench';
import { Preview, PREVIEW_BACKGROUNDS, type PreviewBackground } from './preview';
import { AlertIcon, CheckIcon, Chevron, CopyIcon, DownloadIcon, UploadIcon } from './icons';

function hasFiles(event: { dataTransfer: DataTransfer | null }) {
  return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');
}

export function Workbench() {
  const workspace = useWorkbench();
  const { state } = workspace;
  const [hydrated, setHydrated] = useState(false);
  const [background, setBackground] = useState<PreviewBackground>('checker');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragDepth = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const code = useRef<HTMLTextAreaElement>(null);
  const outputDetails = useRef<HTMLDetailsElement>(null);
  const downloadUrl = useRef<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = state.status === 'optimizing';
  const empty = !state.source.trim();
  const canExport = state.result !== null && !busy && state.result.precision === state.precision;
  const canRetry = state.baseline !== null && ['ready', 'failed', 'cancelled'].includes(state.status);
  const sourceBytes = state.source ? byteLength(state.source) : null;
  const baselineBytes = state.baseline === null ? null : byteLength(state.baseline);
  const resultBytes = state.result === null ? null : byteLength(state.result.text);
  const trend = sourceBytes === null || resultBytes === null ? 'none'
    : resultBytes < sourceBytes ? 'smaller' : resultBytes > sourceBytes ? 'larger' : 'same';

  useEffect(() => setHydrated(true), []);

  // A file dropped beside the drop zone must not navigate away and discard the current work.
  useEffect(() => {
    const block = (event: globalThis.DragEvent) => { if (hasFiles(event)) event.preventDefault(); };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  useEffect(() => () => {
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = null;
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(false);
  }, [state.result?.text]);

  async function copyCode() {
    if (!canExport || !state.result) return;
    try {
      await navigator.clipboard.writeText(state.result.text);
      workspace.announce('Copied optimized SVG code.');
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      if (outputDetails.current) outputDetails.current.open = true;
      code.current?.focus();
      code.current?.select();
      workspace.announce('Clipboard unavailable. Select and copy the output code below, or download the SVG.');
    }
  }

  function download() {
    if (!canExport || !state.result) return;
    try {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = URL.createObjectURL(new Blob([state.result.text], { type: 'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = downloadUrl.current;
      link.download = outputFilename(state.name);
      document.body.append(link);
      link.click();
      link.remove();
      workspace.announce('SVG download started.');
    } catch { workspace.announce('The download could not start. Copy the output code below instead.'); }
  }

  function clear() {
    workspace.clear();
    source.current?.focus();
  }

  const drop = {
    onDragEnter(event: DragEvent) {
      if (!hasFiles(event) || !hydrated) return;
      event.preventDefault();
      dragDepth.current++;
      setDragging(true);
    },
    onDragOver(event: DragEvent) {
      if (!hasFiles(event) || !hydrated) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = event.dataTransfer.files;
      if (hydrated && files.length) void workspace.chooseFile(files[0], files.length > 1 ? 'Loaded the first SVG only.' : '');
    },
  };

  const statusText = state.notice || ({
    idle: '', validating: 'Checking your SVG…', ready: '',
    optimizing: 'Optimizing on your device…', done: '', failed: '', cancelled: 'Optimization cancelled.',
  }[state.status]);

  return <section className="workbench" aria-labelledby="workbench-heading" data-status={state.status}
    data-dragging={dragging || undefined} {...drop}>
    <h2 id="workbench-heading" className="visually-hidden">SVG optimization workspace</h2>
    <div className="workspace-panels">
      <section className="source-panel" aria-labelledby="source-heading">
        <div className="panel-header source-header">
          <h3 id="source-heading">Source SVG</h3>
          <div className="source-actions">
            <button className="button text-button" disabled={!hydrated} onClick={() => workspace.updateSource(EXAMPLE_SVG, EXAMPLE_NAME)}>Load example</button>
            <button className={`button ${empty ? 'primary' : 'secondary'}`} disabled={!hydrated} onClick={() => input.current?.click()}>Choose file</button>
            <input ref={input} type="file" accept=".svg,image/svg+xml" aria-label="Choose SVG file" className="visually-hidden" tabIndex={-1} disabled={!hydrated}
              onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void workspace.chooseFile(file);
              }} />
          </div>
        </div>
        <label htmlFor="svg-source" className="visually-hidden">SVG source code</label>
        <textarea id="svg-source" ref={source} className="source-editor" value={state.source} spellCheck={false} readOnly={!hydrated}
          autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder="Paste SVG code here, or drop an .svg file onto this panel."
          aria-invalid={!!state.error} aria-describedby={`source-help${state.error ? ' svg-error' : ''}`}
          onChange={event => workspace.updateSource(event.currentTarget.value)} />
        {state.error && <p id="svg-error" role="alert" className="error-message"><AlertIcon /><span>{state.error}</span></p>}
        <p className="source-help" id="source-help">Static SVG · Up to 1 MiB{state.name && <span className="input-name" title={state.name}> · {state.name}</span>}</p>
        <div className="options-row">
          <div className="precision-field">
            <label htmlFor="precision">Precision</label>
            <div className="select-wrap"><select id="precision" value={state.precision} disabled={busy || !hydrated} aria-describedby="precision-help"
              onChange={event => workspace.setPrecision(Number(event.currentTarget.value))}>
              {[2, 3, 4, 5].map(value => <option value={value} key={value}>{value} decimals</option>)}
            </select><Chevron /></div>
          </div>
          <div className="run-state">
            {state.status === 'idle' && <span className="run-note" aria-hidden="true">Optimizes as soon as you add an SVG</span>}
            {state.status === 'validating' && <span className="run-note" aria-hidden="true">Checking SVG…</span>}
            {busy && <>
              <span className="run-note" aria-hidden="true"><span className="run-pulse" />Optimizing…</span>
              <button className="button secondary" onClick={workspace.cancel}>Cancel</button>
            </>}
            {state.status === 'done' && state.result && <span className="run-note is-done" aria-hidden="true"><CheckIcon />Optimized at {state.result.precision} decimals</span>}
            {canRetry && <button className={`button ${state.result ? 'secondary' : 'primary'}`} onClick={workspace.optimize}>Optimize SVG</button>}
            <button className="button text-button" disabled={empty && state.status === 'idle'} onClick={clear}>Clear</button>
          </div>
        </div>
        <p className="precision-help" id="precision-help">Lower precision gives a smaller file. Raise it if fine details shift.</p>
      </section>

      <section className="output-panel" aria-labelledby="preview-heading">
        <div className="panel-header preview-header">
          <h3 id="preview-heading">Preview</h3>
          <fieldset className="bg-toggle">
            <legend className="visually-hidden">Preview background</legend>
            {PREVIEW_BACKGROUNDS.map(option => <label key={option.value} className="bg-option">
              <input type="radio" name="preview-background" value={option.value} checked={background === option.value}
                onChange={() => setBackground(option.value)} />
              <span className="swatch" data-swatch={option.value} aria-hidden="true" />{option.label}
            </label>)}
          </fieldset>
        </div>
        <Preview baseline={state.baseline} output={state.result?.text ?? null} background={background} onError={workspace.previewFailed} />
        <dl className="file-metrics">
          {[{ label: 'Original', bytes: sourceBytes }, { label: 'After sanitizing', bytes: baselineBytes }, { label: 'Optimized', bytes: resultBytes }].map(item =>
            <div key={item.label}><dt>{item.label}</dt><dd>{item.bytes === null ? '—' : formatBytes(item.bytes)}</dd></div>)}
        </dl>
        <div className="result-row">
          <div className="comparisons" data-trend={trend}>
            <p className="delta">{sourceBytes !== null && resultBytes !== null ? sizeChange(sourceBytes, resultBytes) : 'Size change'}</p>
            <p className="delta-detail">{trend === 'none'
              ? 'Appears here once the SVG is optimized.'
              : trend === 'larger'
                ? 'The output is larger than your input. Keep your original file.'
                : `${sizeChange(baselineBytes!, resultBytes!)} from optimization alone`}</p>
          </div>
          <div className="export-buttons">
            <button className="button secondary" disabled={!canExport} data-copied={copied || undefined} onClick={() => void copyCode()}>{copied ? <CheckIcon /> : <CopyIcon />}Copy code</button>
            <button className="button primary" disabled={!canExport} onClick={download}><DownloadIcon />Download SVG</button>
          </div>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="status-message">{statusText}</p>
      </section>
    </div>

    {state.result && <details ref={outputDetails} className="output-code">
      <summary>View optimized SVG code <Chevron /></summary>
      <label htmlFor="output-code" className="visually-hidden">Optimized SVG code</label>
      <textarea id="output-code" ref={code} value={state.result.text} readOnly spellCheck={false} />
    </details>}
    <div className="workspace-help">
      <p>Works with paths, shapes, text, gradients and masks.</p>
      <a className="link" href="#supported">See supported SVG content</a>
    </div>
    <div className="drop-overlay" aria-hidden="true"><UploadIcon /><span>Drop SVG to load</span></div>
  </section>;
}
