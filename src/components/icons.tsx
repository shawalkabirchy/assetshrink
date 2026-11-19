import type { SVGProps } from 'react';

export function BrandMark() {
  return <svg width="32" height="38" viewBox="0 0 32 38" fill="none" aria-hidden="true">
    <path d="M4 35C-6 13 9 1 30 1C26 19 20 32 4 35Z" fill="#17634d" />
    <path d="M5 36C15 23 24 21 31 22C28 32 19 39 5 36Z" fill="#6a9c8c" />
    <path d="M3 36L23 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

/** GitHub's own mark (Octicons mark-github), in GitHub's ink colour. */
export function GitHubMark() {
  return <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
    <path fill="#1f2328" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
  </svg>;
}

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return <svg width="64" height="64" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
    <rect x="5" y="7" width="38" height="34" rx="2" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="33" cy="17" r="3" stroke="currentColor" strokeWidth="2.5" />
    <path d="M6 37L19 22L35 40M29 33L34 28L42 36" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>;
}

function Glyph({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function Chevron() {
  return <Glyph><path d="M5 9l7 7 7-7" /></Glyph>;
}

export function CheckIcon({ size }: { size?: number }) {
  return <Glyph size={size}><path d="M4.5 12.5l5 5 10-11" /></Glyph>;
}

export function CrossIcon({ size }: { size?: number }) {
  return <Glyph size={size}><path d="M6 6l12 12M18 6L6 18" /></Glyph>;
}

export function AlertIcon() {
  return <Glyph><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></Glyph>;
}

export function CopyIcon() {
  return <Glyph><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Glyph>;
}

export function DownloadIcon() {
  return <Glyph><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Glyph>;
}

export function UploadIcon() {
  return <Glyph size={40}><path d="M12 16V4M7 8.5l5-5 5 5M5 20h14" /></Glyph>;
}
