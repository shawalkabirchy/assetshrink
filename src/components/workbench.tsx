'use client';

import { useEffect, useRef, useState } from 'react';
import { byteLength, formatBytes, outputFilename, sizeChange } from '../lib/metrics';
import { EXAMPLE_NAME, EXAMPLE_SVG } from '../lib/example';
import { useWorkbench } from './use-workbench';
import { Preview } from './preview';
import { Chevron } from './icons';

export function Workbench() {
  const workspace = useWorkbench();
  const { state } = workspace;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const input = useRef<HTMLInputElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const code = useRef<HTMLTextAreaElement>(null);
  const outputDetails = useRef<HTMLDetailsElement>(null);
  const downloadUrl = useRef<string | null>(null);
  const busy = state.status === 'optimizing';
  const canExport = state.result !== null && !busy && state.result.precision === state.precision;
  const sourceBytes = state.source ? byteLength(state.source) : null;
  const baselineBytes = state.baseline === null ? null : byteLength(state.baseline);
  const resultBytes = state.result === null ? null : byteLength(state.result.text);

  useEffect(() => () => {
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = null;
  }, [state.result?.text]);

  async function copyCode() {
    if (!canExport || !state.result) return;
    try {
      await navigator.clipboard.writeText(state.result.text);
      workspace.announce('Copied optimized SVG code.');
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

  const statusText = state.notice || ({
    idle: '', validating: 'Checking your SVG…', ready: 'SVG validated. Ready to optimize.',
    optimizing: 'Optimizing on your device…', done: 'Optimization complete. Review both sizes before downloading.',
    failed: '', cancelled: 'Optimization cancelled.',
  }[state.status]);

  return <section className="workbench" aria-label="SVG optimization workspace" data-status={state.status}>
    <div className="workspace-panels">
      <section className="source-panel" aria-labelledby="source-heading">
        <div className="panel-header source-header">
          <h2 id="source-heading">Source SVG</h2>
          <div className="source-actions">
            <button className="button text-button" disabled={!hydrated} onClick={() => workspace.updateSource(EXAMPLE_SVG, EXAMPLE_NAME)}>Load example</button>
            <button className="button secondary" disabled={!hydrated} onClick={() => input.current?.click()}>Choose file</button>
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
          autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder="Paste your SVG code here…"
          aria-invalid={!!state.error} aria-describedby={`source-help${state.error ? ' svg-error' : ''}`}
          onChange={event => workspace.updateSource(event.currentTarget.value)} />
        <div className="options-row">
          <div className="precision-field">
            <label htmlFor="precision">Precision</label>
            <div className="select-wrap"><select id="precision" value={state.precision} disabled={busy || !hydrated}
              onChange={event => workspace.setPrecision(Number(event.currentTarget.value))}>
              {[2, 3, 4, 5].map(value => <option value={value} key={value}>{value} decimals</option>)}
            </select><Chevron /></div>
          </div>
          <button className="button text-button reset-button" disabled={state.status === 'idle'} onClick={workspace.reset}>Reset</button>
          <button className="button primary optimize-button" disabled={!state.baseline || state.status === 'validating'}
            onClick={() => busy ? workspace.cancel() : void workspace.optimize()}>{busy ? 'Cancel' : 'Optimize SVG'}</button>
        </div>
        <p className="source-help" id="source-help">Static SVG · Up to 1 MiB{state.name && <span className="input-name" title={state.name}> · {state.name}</span>}</p>
      </section>

      <section className="output-panel" aria-labelledby="preview-heading">
        <div className="panel-header preview-header"><h2 id="preview-heading">Preview comparison</h2><span>256 px</span></div>
        <Preview baseline={state.baseline} output={state.result?.text ?? null} onError={workspace.previewFailed} />
        <dl className="file-metrics">
          {[{ label: 'Original input', bytes: sourceBytes }, { label: 'Safe baseline', bytes: baselineBytes }, { label: 'Optimized output', bytes: resultBytes }].map(item =>
            <div key={item.label}><dt>{item.label}</dt><dd>{item.bytes === null ? '—' : formatBytes(item.bytes)}</dd></div>)}
        </dl>
        <div className="output-actions">
          <div className="comparisons">
            <span>Input to output: <strong>{sourceBytes !== null && resultBytes !== null ? sizeChange(sourceBytes, resultBytes) : '—'}</strong></span>
            <span>Optimization only: <strong>{baselineBytes !== null && resultBytes !== null ? sizeChange(baselineBytes, resultBytes) : '—'}</strong></span>
          </div>
          <div className="export-buttons"><button className="button secondary" disabled={!canExport} onClick={() => void copyCode()}>Copy code</button>
            <button className="button primary" disabled={!canExport} onClick={download}>Download SVG</button></div>
        </div>
      </section>
    </div>

    <div className="feedback">
      {state.error && <p id="svg-error" role="alert" className="error-message">{state.error}</p>}
      <p role="status" aria-live="polite" aria-atomic="true" className={statusText ? 'status-message' : 'visually-hidden'}>{statusText}</p>
      {state.result && !busy && <p className="result-guidance">If fine details shift, choose a higher precision or reset to the safe original.</p>}
    </div>
    {state.result && <details ref={outputDetails} className="output-code">
      <summary>View optimized SVG code <Chevron /></summary>
      <label htmlFor="output-code" className="visually-hidden">Optimized SVG code</label>
      <textarea id="output-code" ref={code} value={state.result.text} readOnly spellCheck={false} />
    </details>}
    <div className="workspace-help">
      <p>Works with paths, shapes, gradients and masks.</p>
      <details className="support-details">
        <summary><Chevron />Supported SVGs and privacy</summary>
        <div className="support-content">
          <h3>A focused, static SVG tool</h3>
          <p>One UTF-8 SVG at a time, up to 1 MiB. Shapes, paths, text, groups, gradients, masks, clipping paths, and local #id references are supported.</p>
          <p>Scripts, event handlers, animation, embedded HTML/images, external fonts/resources, document types, and CSS styles are rejected. If your export uses CSS, export again with presentation attributes.</p>
          <p>Before optimization shows the sanitized baseline. Size comparisons distinguish changes from sanitization and optimization. Precision can change fine details; check both preview sizes.</p>
          <p>Your source, filename, and results stay in memory on this device. Refreshing clears them. There are no uploads, accounts, tracking scripts, or saved history.</p>
        </div>
      </details>
    </div>
  </section>;
}
