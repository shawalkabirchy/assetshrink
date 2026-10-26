import type { SVGProps } from 'react';

export function BrandMark() {
  return <svg width="32" height="38" viewBox="0 0 32 38" fill="none" aria-hidden="true">
    <path d="M4 35C-6 13 9 1 30 1C26 19 20 32 4 35Z" fill="#17634d" />
    <path d="M5 36C15 23 24 21 31 22C28 32 19 39 5 36Z" fill="#6a9c8c" />
    <path d="M3 36L23 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return <svg width="76" height="76" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
    <rect x="5" y="7" width="38" height="34" rx="2" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="33" cy="17" r="3" stroke="currentColor" strokeWidth="2.5" />
    <path d="M6 37L19 22L35 40M29 33L34 28L42 36" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>;
}

export function Chevron() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 9L12 16L19 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
