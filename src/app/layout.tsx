import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

// Downloaded at build time and served from this site, so the strict `font-src 'self'` policy holds.
const sans = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'AssetShrink — Private SVG optimizer',
  description: 'Make your SVGs lighter with safe previews and local optimization. An independent tool by ConsoleLog Studio. Your files stay on your device.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
