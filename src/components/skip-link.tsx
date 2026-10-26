'use client';

export function SkipLink() {
  return <a href="#svg-source" className="skip-link" tabIndex={0} onClick={event => {
    const input = document.getElementById('svg-source');
    if (input) {
      event.preventDefault();
      input.focus();
    }
  }}>Skip to SVG input</a>;
}
