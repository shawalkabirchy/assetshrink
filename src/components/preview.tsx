'use client';

import { useEffect, useState } from 'react';
import { ImageIcon } from './icons';

export type PreviewBackground = 'checker' | 'light' | 'dark';
export const PREVIEW_BACKGROUNDS: { value: PreviewBackground; label: string }[] = [
  { value: 'checker', label: 'Grid' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function useSvgUrl(text: string | null) {
  const [image, setImage] = useState<{ text: string; url: string } | null>(null);
  useEffect(() => {
    if (text === null) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
    setImage({ text, url });
    return () => URL.revokeObjectURL(url);
  }, [text]);
  return image?.text === text ? image.url : undefined;
}

export function Preview({ baseline, output, background, onError }: {
  baseline: string | null; output: string | null; background: PreviewBackground; onError: () => void;
}) {
  const baselineUrl = useSvgUrl(baseline);
  const outputUrl = useSvgUrl(output);
  return <div className="preview-grid" role="group" aria-label="Before and after SVG previews" data-bg={background}>
    {[
      { label: 'Before optimization', short: 'Before', url: baselineUrl, placeholder: 'Your SVG appears here' },
      { label: 'After optimization', short: 'After', url: outputUrl, placeholder: 'The optimized SVG appears here' },
    ].map(item => <figure key={item.label}>
      <figcaption>{item.label}</figcaption>
      <div className="preview-canvas">
        {item.url
          // User SVGs stay in image contexts, never in application markup.
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.url} width="256" height="256" alt={`${item.label}, 256 pixels`} onError={onError} />
          : <div className="preview-placeholder"><ImageIcon /><span>{item.placeholder}</span></div>}
      </div>
      <div className="small-preview">
        <div className="small-preview-canvas">
          {item.url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.url} width="24" height="24" alt={`${item.short}, 24 pixels`} onError={onError} />
            : <ImageIcon width="24" height="24" />}
        </div>
        <span>24 px, actual size</span>
      </div>
    </figure>)}
  </div>;
}
