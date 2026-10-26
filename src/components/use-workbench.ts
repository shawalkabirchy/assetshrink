'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_INPUT_BYTES } from '../lib/metrics';
import { startOptimization } from '../lib/optimization-job';
import { SvgError, validateInput, validateOutput } from '../lib/svg';

type Status = 'idle' | 'validating' | 'ready' | 'optimizing' | 'done' | 'failed' | 'cancelled';
type State = {
  source: string;
  name: string;
  baseline: string | null;
  result: { text: string; precision: number } | null;
  precision: number;
  status: Status;
  error: string | null;
  notice: string;
};

export function useWorkbench() {
  const [state, setState] = useState<State>({
    source: '', name: '', baseline: null, result: null, precision: 3,
    status: 'idle', error: null, notice: '',
  });
  const revision = useRef(0);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeJob = useRef<ReturnType<typeof startOptimization> | null>(null);

  function stopPending() {
    if (validationTimer.current) clearTimeout(validationTimer.current);
    activeJob.current?.cancel();
    activeJob.current = null;
  }

  useEffect(() => () => {
    revision.current++;
    if (validationTimer.current) clearTimeout(validationTimer.current);
    activeJob.current?.cancel();
  }, []);

  function fail(error: unknown) {
    setState(previous => ({
      ...previous, status: 'failed',
      precision: previous.result?.precision ?? previous.precision,
      error: error instanceof SvgError ? error.message : 'The SVG could not be processed. Reload and try again.',
    }));
  }

  function updateSource(source: string, name = state.name) {
    stopPending();
    const ticket = ++revision.current;
    setState(previous => ({
      ...previous, source, name, baseline: null, result: null, error: null, notice: '',
      status: source.trim() ? 'validating' : 'idle',
    }));
    if (!source.trim()) return;
    validationTimer.current = setTimeout(async () => {
      try {
        const baseline = await validateInput(source);
        if (revision.current !== ticket) return;
        setState(previous => ({ ...previous, baseline, status: 'ready' }));
      } catch (error) { if (revision.current === ticket) fail(error); }
    }, 180);
  }

  async function chooseFile(file: File) {
    stopPending();
    const ticket = ++revision.current;
    setState(previous => ({
      ...previous, source: '', name: file.name, baseline: null, result: null,
      status: 'validating', error: null, notice: '',
    }));
    try {
      if (!/\.svg$/i.test(file.name)) throw new SvgError('Choose a file with the .svg extension. Other formats are unsupported.');
      if (file.size > MAX_INPUT_BYTES) throw new SvgError('This SVG exceeds 1 MiB. Choose a smaller file.', 'FILE_TOO_LARGE');
      const bytes = await file.arrayBuffer();
      let source: string;
      try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new SvgError('This file is not valid UTF-8. Re-export the SVG using UTF-8 encoding.'); }
      if (revision.current === ticket) updateSource(source, file.name);
    } catch (error) { if (revision.current === ticket) fail(error); }
  }

  async function optimize(precision = state.precision) {
    if (!state.baseline) return;
    stopPending();
    const ticket = revision.current;
    const baseline = state.baseline;
    let job: ReturnType<typeof startOptimization> | null = null;
    setState(previous => ({ ...previous, precision, status: 'optimizing', error: null, notice: '' }));
    try {
      job = startOptimization(baseline, precision);
      activeJob.current = job;
      const output = await job.promise;
      const text = await validateOutput(baseline, output);
      if (revision.current !== ticket || activeJob.current !== job) return;
      activeJob.current = null;
      setState(previous => ({ ...previous, result: { text, precision }, status: 'done' }));
    } catch (error) {
      if (revision.current === ticket && (job === null || activeJob.current === job)) {
        activeJob.current = null;
        fail(error);
      }
    }
  }

  function cancel() {
    stopPending();
    setState(previous => ({
      ...previous, status: 'cancelled', precision: previous.result?.precision ?? previous.precision,
      notice: previous.result ? 'Cancelled. Your previous completed result is retained.' : 'Cancelled. You can optimize again.',
    }));
  }

  function setPrecision(precision: number) {
    setState(previous => ({ ...previous, precision }));
    if (state.result) void optimize(precision);
  }

  function reset() {
    stopPending();
    revision.current++;
    if (!state.baseline) { updateSource('', ''); return; }
    setState(previous => ({
      ...previous, precision: 3, result: null, status: 'ready', error: null,
      notice: 'Reset to the safe original. Your source code is unchanged.',
    }));
  }

  function previewFailed() {
    stopPending();
    revision.current++;
    setState(previous => ({
      ...previous, baseline: null, result: null, status: 'failed',
      error: 'This SVG could not be previewed. Check its dimensions or export a simpler static SVG.',
    }));
  }

  function announce(notice: string) { setState(previous => ({ ...previous, notice })); }

  return { state, updateSource, chooseFile, optimize, cancel, setPrecision, reset, previewFailed, announce };
}
