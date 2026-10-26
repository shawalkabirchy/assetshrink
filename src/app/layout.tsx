import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssetShrink — Private SVG optimizer',
  description: 'Make your SVGs lighter with safe previews and local optimization. An independent tool by ConsoleLog Studio. Your files stay on your device.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
