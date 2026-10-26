import { describe, expect, it, vi, afterEach } from 'vitest';
import { byteLength, MAX_INPUT_BYTES, outputFilename, sizeChange } from '../../src/lib/metrics';
import { optimizeSvg } from '../../src/lib/optimize';
import { startOptimization } from '../../src/lib/optimization-job';
import { EXAMPLE_SVG } from '../../src/lib/example';

describe('measurements and export names', () => {
  it('counts actual UTF-8 bytes and enforces a binary MiB boundary', () => {
    expect(byteLength('Aé🍃')).toBe(7);
    expect(byteLength('x'.repeat(MAX_INPUT_BYTES))).toBe(MAX_INPUT_BYTES);
  });
  it('reports both increases and reductions, with no zero-baseline percentage', () => {
    expect(sizeChange(100, 75)).toBe('25.0% smaller');
    expect(sizeChange(100, 125)).toBe('25.0% larger');
    expect(sizeChange(0, 125)).toBe('+125 B');
    expect(sizeChange(100, 100)).toBe('No change');
  });
  it('keeps download names inside a safe basename', () => {
    expect(outputFilename('C:\\icons\\Studio Leaf.SVG')).toBe('Studio-Leaf.optimized.svg');
    expect(outputFilename('../../.svg')).toBe('asset.optimized.svg');
    expect(outputFilename('')).toBe('asset.optimized.svg');
    expect(outputFilename('বাংলা.svg')).toBe('বাংলা.optimized.svg');
  });
});

describe('conservative optimization', () => {
  it('retains accessibility, IDs, references, colors, and exact root dimensions', () => {
    const source = EXAMPLE_SVG.replace('width="256"', 'width="256.123456"');
    const result = optimizeSvg(source, 2);
    for (const token of ['viewBox="0 0 256 256"', 'width="256.123456"', 'height="256"',
      'leaf-title', 'leaf-description', 'leaf-gradient', 'leaf-mask', 'leaf-shape',
      'url(#leaf-gradient)', 'url(#leaf-mask)', '<title', '<desc', '#17634d']) {
      expect(result).toContain(token);
    }
    expect(result).not.toContain('<!--');
    expect(byteLength(result)).toBeLessThan(byteLength(source));
  });
  it('reruns from the baseline so a higher precision recovers detail', () => {
    const low = optimizeSvg(EXAMPLE_SVG, 2);
    const high = optimizeSvg(EXAMPLE_SVG, 5);
    expect(low).not.toBe(high);
    expect(high).toContain('65.12345');
    expect(optimizeSvg(low, 5)).not.toBe(high);
  });
  it('rejects invalid precision instead of accepting arbitrary worker input', () => {
    expect(() => optimizeSvg(EXAMPLE_SVG, 1)).toThrow('Precision');
    expect(() => optimizeSvg(EXAMPLE_SVG, Number.NaN)).toThrow('Precision');
  });
});

class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.last = this; }
}

describe('worker lifecycle', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  function setup() {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    return startOptimization('<svg/>', 3);
  }
  it('terminates and clears the timer after a completed job', async () => {
    const job = setup();
    FakeWorker.last.onmessage!({ data: { result: '<svg/>' } });
    await expect(job.promise).resolves.toBe('<svg/>');
    expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels exactly once and ignores a late completion', async () => {
    const job = setup();
    const lateMessage = FakeWorker.last.onmessage!;
    const rejection = expect(job.promise).rejects.toMatchObject({ code: 'CANCELLED' });
    job.cancel();
    lateMessage({ data: { result: 'stale' } });
    job.cancel();
    await rejection;
    expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
  it('times out after exactly five seconds', async () => {
    const job = setup();
    const rejection = expect(job.promise).rejects.toMatchObject({ code: 'PROCESSING_FAILED' });
    vi.advanceTimersByTime(4999);
    expect(FakeWorker.last.terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await rejection;
    expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
  it('rejects corrupt worker responses and runtime failures', async () => {
    const job = setup();
    const rejection = expect(job.promise).rejects.toMatchObject({ code: 'PROCESSING_FAILED' });
    FakeWorker.last.onmessage!({ data: { result: 42 } });
    await rejection;
    const next = setup();
    const nextRejection = expect(next.promise).rejects.toMatchObject({ code: 'PROCESSING_FAILED' });
    const event = new Event('error', { cancelable: true });
    FakeWorker.last.onerror!(event);
    await nextRejection;
    expect(event.defaultPrevented).toBe(true);
  });
});
