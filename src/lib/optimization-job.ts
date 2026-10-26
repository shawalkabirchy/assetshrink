import { SvgError } from './svg';

export function startOptimization(source: string, precision: number) {
  const worker = new Worker(new URL('../workers/optimize.worker.ts', import.meta.url), { type: 'module' });
  let finish: (error?: SvgError, value?: string) => void;
  const promise = new Promise<string>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new SvgError(
      'Optimization took longer than 5 seconds. Try a simpler SVG or keep the original.', 'PROCESSING_FAILED',
    )), 5000);
    finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      if (error) reject(error);
      else resolve(value!);
    };
    worker.onmessage = (event: MessageEvent) => {
      if (typeof event.data?.result === 'string') finish(undefined, event.data.result);
      else finish(new SvgError('The SVG could not be optimized. Reset or try another SVG.', 'PROCESSING_FAILED'));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(new SvgError('The optimizer could not run. Reload the page and try again.', 'PROCESSING_FAILED'));
    };
    try { worker.postMessage({ source, precision }); }
    catch { finish(new SvgError('The optimizer could not start. Reload and try again.', 'PROCESSING_FAILED')); }
  });
  return {
    promise,
    cancel: () => finish(new SvgError('Optimization cancelled. Your last completed result is retained.', 'CANCELLED')),
  };
}
