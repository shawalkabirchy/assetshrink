const svg = (content: string, attributes = '') => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${content}</svg>`;

export const hostileSvgs = [
  { name: 'script', source: svg('<script>alert(1)</script>') },
  { name: 'event', source: svg('<path d="M0 0h10"/>', 'onload="alert(1)"') },
  { name: 'foreign HTML', source: svg('<foreignObject><body xmlns="http://www.w3.org/1999/xhtml" onload="alert(1)"/></foreignObject>') },
  { name: 'CSS import', source: svg('<style>@import url(https://example.invalid/private.svg);</style>') },
  { name: 'inline CSS', source: svg('<path style="fill:url(https://example.invalid/private.svg)"/>') },
  { name: 'external image', source: svg('<image href="https://example.invalid/private.svg"/>') },
  { name: 'embedded image', source: svg('<image href="data:image/svg+xml,invalid"/>') },
  { name: 'executable link', source: svg('<a href="javascript:alert(1)"><text>Click</text></a>') },
  { name: 'entity-obscured scheme', source: svg('<use href="&#106;avascript:alert(1)"/>') },
  { name: 'animation', source: svg('<animate attributeName="x" values="0;100" dur="1s"/>') },
  { name: 'doctype', source: '<!DOCTYPE svg [<!ENTITY leak SYSTEM "https://example.invalid/private">]>' + svg('<text>&leak;</text>') },
  { name: 'stylesheet instruction', source: '<?xml-stylesheet href="https://example.invalid/private.css"?>' + svg('') },
  { name: 'xml base', source: svg('<path id="p"/><use href="#p" xml:base="https://example.invalid/"/>') },
  { name: 'external paint', source: svg('<path fill="url(https://example.invalid/private.svg#p)"/>') },
  { name: 'escaped paint URL', source: svg('<path fill="u\\72l(https://example.invalid/private.svg)"/>') },
  { name: 'missing reference', source: svg('<path fill="url(#missing)"/>') },
  { name: 'duplicate IDs', source: svg('<g id="same"/><g id="same"/>') },
  { name: 'foreign namespace', source: svg('<g xmlns="http://www.w3.org/1999/xhtml"/>') },
  { name: 'multiple roots', source: svg('') + svg('') },
];
