import { Workbench } from '../components/workbench';
import { BrandMark } from '../components/icons';
import { SkipLink } from '../components/skip-link';

export default function Home() {
  return <>
    <SkipLink />
    <header className="site-header">
      <a href="/" className="brand" aria-label="AssetShrink home"><BrandMark /><span>AssetShrink</span></a>
      <a href="https://consolelog.studio/" className="studio-link" rel="noreferrer">by ConsoleLog Studio</a>
    </header>
    <main className="page-content">
      <div className="intro"><h1>Less weight. Same detail.</h1>
        <p>Optimize static SVGs in your browser. Your files stay on your device.</p></div>
      <noscript><p>Enable JavaScript to use AssetShrink. SVG processing runs entirely on your device.</p></noscript>
      <Workbench />
    </main>
    <footer className="site-footer"><a href="https://consolelog.studio/" rel="noreferrer">Built by ConsoleLog Studio</a><span>Everything happens on your device.</span></footer>
  </>;
}
