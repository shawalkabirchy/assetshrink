import { optimizeSvg } from '../lib/optimize';

self.onmessage = (event: MessageEvent<{ source: string; precision: number }>) => {
  try {
    const result = optimizeSvg(event.data.source, event.data.precision);
    self.postMessage({ result });
  } catch {
    self.postMessage({ error: 'The SVG could not be optimized. Reset or try another static SVG.' });
  }
};
