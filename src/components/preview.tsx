'use client';

import { useEffect, useState } from 'react';
import { ImageIcon } from './icons';

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

export function Preview({ baseline, output, onError }: {
  baseline: string | null; output: string | null; onError: () => void;
}) {
  const baselineUrl = useSvgUrl(baseline);
  const outputUrl = useSvgUrl(output);
  return <>
    <div className="preview-scroll" tabIndex={0} role="region" aria-label="Before and after SVG previews">
      <div className="large-previews">
        {[
          { label: 'Before optimization', url: baselineUrl, placeholder: 'Your SVG preview' },
          { label: 'After optimization', url: outputUrl, placeholder: 'Optimize to compare' },
        ].map(item => <figure key={item.label}>
          <figcaption>{item.label}</figcaption>
          <div className="preview-canvas">
            {item.url
              // User SVGs stay in image contexts, never in application markup.
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.url} width="256" height="256" alt={`${item.label}, 256 pixels`} onError={onError} />
              : <div className="preview-placeholder"><ImageIcon /><span>{item.placeholder}</span></div>}
          </div>
        </figure>)}
      </div>
      <div className="small-previews">
        <span className="small-size">24 px</span>
        {[{ url: baselineUrl, label: 'Before' }, { url: outputUrl, label: 'After' }].map(item =>
          <div className="small-preview-canvas" key={item.label}>
            {item.url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.url} width="24" height="24" alt={`${item.label}, 24 pixels`} onError={onError} />
              : <ImageIcon width="34" height="34" />}
          </div>)}
      </div>
    </div>
  </>;
}
