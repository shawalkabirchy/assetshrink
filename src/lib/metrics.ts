export const MAX_INPUT_BYTES = 1024 * 1024;

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString('en-US')} B`;
}

export function sizeChange(before: number, after: number): string {
  if (before === after) return 'No change';
  if (before === 0) return `+${formatBytes(after)}`;
  const percent = (Math.abs(after - before) / before * 100).toFixed(1);
  return `${percent}% ${after > before ? 'larger' : 'smaller'}`;
}

export function outputFilename(name: string): string {
  const base = name.split(/[\\/]/).pop()!.replace(/\.svg$/i, '')
    .replace(/[^\p{L}\p{M}\p{N}._-]+/gu, '-').replace(/^\.+|[-.]+$/g, '').slice(0, 80);
  return `${base || 'asset'}.optimized.svg`;
}
