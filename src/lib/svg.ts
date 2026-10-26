import { byteLength, MAX_INPUT_BYTES } from './metrics';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

const TAGS = [
  'svg', 'g', 'defs', 'symbol', 'use', 'path', 'rect', 'circle', 'ellipse', 'line',
  'polyline', 'polygon', 'text', 'tspan', 'textPath', 'linearGradient',
  'radialGradient', 'stop', 'clipPath', 'mask', 'title', 'desc',
];
const ATTRS = [
  'xmlns', 'xmlns:xlink', 'version', 'id', 'class', 'viewBox', 'preserveAspectRatio',
  'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height',
  'd', 'points', 'pathLength', 'transform', 'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'color',
  'clip-path', 'clip-rule', 'clipPathUnits', 'mask', 'maskUnits', 'maskContentUnits',
  'gradientUnits', 'gradientTransform', 'spreadMethod', 'fx', 'fy', 'fr', 'offset',
  'stop-color', 'stop-opacity', 'href', 'xlink:href', 'font-family', 'font-size',
  'font-weight', 'font-style', 'font-stretch', 'font-variant', 'text-anchor',
  'text-decoration', 'dominant-baseline', 'alignment-baseline', 'baseline-shift',
  'letter-spacing', 'word-spacing', 'dx', 'dy', 'rotate', 'textLength',
  'lengthAdjust', 'startOffset', 'method', 'spacing', 'vector-effect',
  'shape-rendering', 'text-rendering', 'paint-order', 'display', 'visibility',
  'overflow', 'xml:space', 'xml:lang', 'lang', 'role', 'aria-label',
  'aria-labelledby', 'aria-describedby', 'aria-hidden',
];
const allowedTags = new Set(TAGS);
const allowedAttrs = new Set(ATTRS);
const paintReferences = new Set(['fill', 'stroke', 'clip-path', 'mask']);

export class SvgError extends Error {
  constructor(message: string, public readonly code = 'FILE_UNSUPPORTED') {
    super(message);
    this.name = 'SvgError';
  }
}

function parseSvg(source: string): XMLDocument {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source) || /<\?(?!xml(?:\s|\?>))/i.test(source)) {
    throw new SvgError('Document declarations, entities, and stylesheets are unsupported. Export a plain static SVG.');
  }
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.getElementsByTagName('parsererror').length || document.documentElement?.localName !== 'svg') {
    throw new SvgError('This is not valid SVG XML. Check the markup and include one root <svg> element.', 'VALIDATION_ERROR');
  }
  return document;
}

function validateStructure(document: XMLDocument): void {
  const root = document.documentElement;
  if (root.namespaceURI && root.namespaceURI !== SVG_NS) {
    throw new SvgError('Use the standard SVG namespace: http://www.w3.org/2000/svg.');
  }
  const ids = new Set<string>();
  const references: string[] = [];
  const walker = document.createTreeWalker(document, 0xFFFFFFFF);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === 7 || node.nodeType === 10) {
      throw new SvgError('Processing instructions and document types are unsupported. Export a plain static SVG.');
    }
    if (node.nodeType !== 1) continue;
    const element = node as Element;
    if (element.localName === 'style' || element.hasAttribute('style')) {
      throw new SvgError('SVG styles are unsupported. Re-export with presentation attributes instead of CSS styles.');
    }
    if (element.prefix || (element.namespaceURI && element.namespaceURI !== SVG_NS) || !allowedTags.has(element.localName)) {
      throw new SvgError(`The <${element.tagName}> element is unsupported. Use static shapes, paths, text, gradients, and masks.`);
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name;
      const value = attribute.value.trim();
      if (name.toLowerCase().startsWith('on')) {
        throw new SvgError('Event handlers and scripts are unsupported. Export a static SVG without active content.');
      }
      if (!allowedAttrs.has(name)) {
        throw new SvgError(`The “${name}” attribute is unsupported. Export a plain SVG with presentation attributes.`);
      }
      if (attribute.namespaceURI === XMLNS_NS) {
        if (!((name === 'xmlns' && value === SVG_NS) || (name === 'xmlns:xlink' && value === XLINK_NS))) {
          throw new SvgError('Only the standard SVG and xlink namespaces are supported.');
        }
      } else if (attribute.namespaceURI && !(
        (attribute.namespaceURI === XLINK_NS && name === 'xlink:href') ||
        (attribute.namespaceURI === XML_NS && (name === 'xml:space' || name === 'xml:lang'))
      )) {
        throw new SvgError('This SVG uses an unsupported attribute namespace.');
      }
      if (name === 'id') {
        if (!value || /[\s#\\]/u.test(value) || value !== attribute.value || ids.has(value)) {
          throw new SvgError('Use unique, non-empty SVG IDs without whitespace, backslashes, or # characters.');
        }
        ids.add(value);
      }
      if (name === 'href' || name === 'xlink:href') {
        if (!/^#[^\s#\\]+$/u.test(value)) {
          throw new SvgError('External resources and executable links are unsupported. References must point to a local #id.');
        }
        references.push(value.slice(1));
      } else if (paintReferences.has(name)) {
        if (value.includes('\\')) {
          throw new SvgError('Escaped resource references are unsupported. Use a plain local url(#id) reference.');
        }
        if (/url\s*\(/i.test(value)) {
          const match = /^url\(\s*(['"]?)(#[^\s'"()#\\]+)\1\s*\)$/iu.exec(value);
          if (!match) throw new SvgError('Paint, masks, and clipping paths may only reference a local url(#id).');
          references.push(match[2].slice(1));
        }
      } else if (/url\s*\(/i.test(value) || value.includes('\\') && name !== 'aria-label') {
        throw new SvgError('Resource URLs and CSS escapes are unsupported in this attribute.');
      }
      if (name === 'aria-labelledby' || name === 'aria-describedby') references.push(...value.split(/\s+/).filter(Boolean));
    }
  }
  if (references.some(id => !ids.has(id))) {
    throw new SvgError('An SVG reference points to a missing ID. Include the referenced definition or accessibility label.');
  }
}

export async function sanitizeSvg(source: string): Promise<string> {
  const document = parseSvg(source);
  validateStructure(document);
  document.documentElement.setAttribute('xmlns', SVG_NS);
  const serialized = new XMLSerializer().serializeToString(document.documentElement);
  const { default: DOMPurify } = await import('dompurify');
  const sanitized = DOMPurify.sanitize(serialized, {
    ALLOWED_TAGS: TAGS,
    ALLOWED_ATTR: ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'foreignObject'],
    FORBID_ATTR: ['style'],
    NAMESPACE: SVG_NS,
    PARSER_MEDIA_TYPE: 'application/xhtml+xml',
  });
  // XML sanitization also reports a synthetic wrapper that was never in the source.
  if (DOMPurify.removed.some(item => 'attribute' in item || ('element' in item && allowedTags.has(item.element.nodeName)))) {
    throw new SvgError('This SVG contains markup or an identifier that cannot be safely preserved. Re-export a plain static SVG.');
  }
  validateStructure(parseSvg(sanitized));
  return sanitized;
}

export async function validateInput(source: string): Promise<string> {
  if (!source.trim()) throw new SvgError('Choose an SVG file or paste SVG code.', 'VALIDATION_ERROR');
  if (byteLength(source) > MAX_INPUT_BYTES) {
    throw new SvgError('This SVG exceeds 1 MiB. Choose a smaller file or shorten the pasted code.', 'FILE_TOO_LARGE');
  }
  return sanitizeSvg(source);
}

export async function validateOutput(baseline: string, output: string): Promise<string> {
  const safe = await sanitizeSvg(output);
  const before = parseSvg(baseline);
  const after = parseSvg(safe);
  for (const attribute of ['viewBox', 'width', 'height', 'preserveAspectRatio']) {
    if (before.documentElement.getAttribute(attribute) !== after.documentElement.getAttribute(attribute)) {
      throw new SvgError('Optimization changed required SVG dimensions. Reset and keep the original.', 'PROCESSING_FAILED');
    }
  }
  const identity = (document: XMLDocument) => Array.from(document.querySelectorAll('[id], title, desc'))
    .map(element => [element.localName, element.getAttribute('id'),
      element.localName === 'title' || element.localName === 'desc' ? element.textContent : null]);
  if (JSON.stringify(identity(before)) !== JSON.stringify(identity(after))) {
    throw new SvgError('Optimization changed SVG IDs or accessibility metadata. Reset and keep the original.', 'PROCESSING_FAILED');
  }
  return safe;
}
