import { optimize, type Config } from 'svgo/browser';

export function optimizeSvg(source: string, precision: number): string {
  if (![2, 3, 4, 5].includes(precision)) throw new Error('Precision must be between 2 and 5.');
  const dimensions: Record<string, string> = {};
  const config: Config = {
    floatPrecision: precision,
    plugins: [
      {
        name: 'rememberRootDimensions',
        fn(root) {
          const svg = root.children.find(node => node.type === 'element' && node.name === 'svg');
          if (svg?.type === 'element') {
            for (const name of ['viewBox', 'width', 'height', 'preserveAspectRatio']) {
              if (svg.attributes[name] !== undefined) dimensions[name] = svg.attributes[name];
            }
          }
        },
      },
      'removeComments',
      { name: 'cleanupNumericValues', params: { floatPrecision: precision } },
      {
        name: 'convertPathData',
        params: {
          floatPrecision: precision,
          applyTransforms: false,
          applyTransformsStroked: false,
          makeArcs: { threshold: 0, tolerance: 0 },
          straightCurves: false,
          convertToQ: false,
          removeUseless: false,
          convertToZ: false,
        },
      },
      { name: 'convertColors', params: { currentColor: false } },
      'sortAttrs',
      {
        name: 'restoreRootDimensions',
        fn(root) {
          const svg = root.children.find(node => node.type === 'element' && node.name === 'svg');
          if (svg?.type === 'element') Object.assign(svg.attributes, dimensions);
        },
      },
    ],
  };
  return optimize(source, config).data;
}
