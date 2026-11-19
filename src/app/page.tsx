import { Workbench } from '../components/workbench';
import { BrandMark, CheckIcon, CrossIcon, GitHubMark } from '../components/icons';
import { SkipLink } from '../components/skip-link';

const SOURCE_URL = 'https://github.com/shawalkabirchy/assetshrink';
const STUDIO_URL = 'https://consolelog.studio/';

const pipeline = [
  { title: 'Parses the XML', body: 'Reads the SVG with an inert XML parser, so nothing in it renders or runs.' },
  { title: 'Removes unsafe content', body: 'Rejects scripts, event handlers and external references, then cleans the markup with DOMPurify.' },
  { title: 'Optimizes in a worker', body: 'Runs SVGO 4 in a background worker that stops after 5 seconds.' },
  { title: 'Checks the output', body: 'Confirms the viewBox, dimensions, IDs and accessible titles survived before you can download.' },
];

const supported = ['Paths and basic shapes', 'Groups and text', 'Linear and radial gradients', 'Masks and clipping paths', 'Local #id references', 'Titles and descriptions'];
const rejected = ['Scripts and event handlers', 'Animation', 'Embedded HTML and images', 'External fonts and resources', 'CSS style elements and attributes', 'Document types'];

export default function Home() {
  return <>
    <SkipLink />
    <header className="site-header wrap">
      <a href="/" className="brand" aria-label="AssetShrink home"><BrandMark /><span>AssetShrink</span></a>
      <nav className="header-links" aria-label="Project links">
        <a href={STUDIO_URL} className="nav-link studio-link" rel="noreferrer">by ConsoleLog Studio</a>
        <a href={SOURCE_URL} className="nav-link github-link" rel="noreferrer"><GitHubMark /><span>Source<span className="wide-only"> on GitHub</span></span></a>
      </nav>
    </header>
    <main className="page-content wrap">
      <div className="intro">
        <h1>SVG optimizer that keeps files on your device</h1>
        <div className="intro-row">
          <p>Paste or drop an SVG, compare it before and after at 256 px and 24 px, then download a lighter file. Nothing is uploaded.</p>
          <ul className="fact-strip" aria-label="Key facts">
            <li><CheckIcon />No uploads or accounts</li>
            <li><CheckIcon />Up to 1 MiB per SVG</li>
            <li><CheckIcon />Scripts and external resources rejected</li>
          </ul>
        </div>
      </div>
      <noscript><p>Enable JavaScript to use AssetShrink. SVG processing runs entirely on your device.</p></noscript>
      <Workbench />

      <section className="info-section" aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading">How AssetShrink processes an SVG</h2>
        <p className="section-lead">Four steps run inside this browser tab. If any step fails, nothing is exported.</p>
        <ol className="pipeline">
          {pipeline.map((step, index) => <li key={step.title} className="card">
            <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>)}
        </ol>
      </section>

      <section className="info-section" id="supported" aria-labelledby="supported-heading">
        <h2 id="supported-heading">Supported and rejected SVG content</h2>
        <p className="section-lead">One static SVG at a time. AssetShrink rejects active or external content instead of guessing how to convert it.</p>
        <div className="support-grid">
          <div className="card">
            <h3><span className="badge is-yes"><CheckIcon size={14} /></span>Supported</h3>
            <ul className="tick-list">{supported.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="card">
            <h3><span className="badge is-no"><CrossIcon size={14} /></span>Rejected</h3>
            <ul className="tick-list">{rejected.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        <p className="support-tip">If your design tool exports CSS styles, export again with presentation attributes.</p>
      </section>

      <section className="info-section" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy on this device</h2>
        <p className="section-lead">Your source, filename and results stay in this tab&apos;s memory. Refreshing the page clears them.</p>
        <div className="privacy-band">
          <ul className="tick-list privacy-list">
            <li><CheckIcon />No upload endpoint or file storage</li>
            <li><CheckIcon />No accounts, analytics or tracking scripts</li>
            <li><CheckIcon />No saved history in browser storage</li>
            <li><CheckIcon />A Content Security Policy blocks requests to other sites</li>
          </ul>
          <p className="privacy-links">
            <a className="link" href={SOURCE_URL} rel="noreferrer">Read the source on GitHub</a>
            <a className="link" href="/third-party-notices.txt">Third-party notices</a>
          </p>
        </div>
      </section>
    </main>
    <footer className="site-footer wrap">
      <a className="nav-link" href={STUDIO_URL} rel="noreferrer">Built by ConsoleLog Studio</a>
      <a className="nav-link" href="/third-party-notices.txt">Third-party notices</a>
      <span>Everything happens on your device.</span>
    </footer>
  </>;
}
