import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { EXAMPLE_SVG } from '../../src/lib/example';
import { byteLength, MAX_INPUT_BYTES, formatBytes } from '../../src/lib/metrics';
import { hostileSvgs } from '../fixtures/hostile';

const tinySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><title>é🍃</title><path fill="#17634d" d="M2.12345 2.45678H22V22H2Z"/></svg>';

// Valid input optimizes automatically once it passes validation.
async function optimized(page: Page, timeout?: number) {
  await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'done', { timeout });
}
async function example(page: Page) {
  await page.getByRole('button', { name: 'Load example' }).click();
  await optimized(page);
}
// Let colour transitions (e.g. a button turning enabled) settle so axe measures the resting state.
async function axeViolations(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))));
  return (await new AxeBuilder({ page }).analyze()).violations;
}
async function optimizedAt(page: Page, precision: number) {
  await expect(page.locator('.run-note.is-done')).toContainText(`${precision} decimals`);
}

test('production page has the correct identity, no errors, and static security headers', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  const response = await page.goto('/');
  await expect(page).toHaveTitle('AssetShrink — Private SVG optimizer');
  await expect(page.getByRole('heading', { name: 'SVG optimizer that keeps files on your device', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  expect(response!.headers()['content-security-policy']).toContain("object-src 'none'");
  expect(response!.headers()['content-security-policy']).toContain("'sha256-");
  expect(response!.headers()['x-content-type-options']).toBe('nosniff');
  expect((await request.post('/api/upload', { data: 'private content' })).status()).toBe(405);
  expect((await request.get('/missing-asset.js')).status()).toBe(404);
  expect((await request.get('/%2e%2e%5cpackage.json')).status()).toBe(404);
  await example(page);
  await expect(page.locator('nextjs-portal')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('gradient/mask file completes a real validated download with preserved metadata', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose SVG file').setInputFiles({ name: 'studio-leaf.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(EXAMPLE_SVG) });
  await optimized(page);
  const images = page.locator('.preview-canvas img');
  await expect(images).toHaveCount(2);
  await expect.poll(() => images.evaluateAll(elements => elements.every(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const dimensions = await page.locator('.small-preview-canvas img').first().boundingBox();
  expect(dimensions?.width).toBe(24);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('studio-leaf.optimized.svg');
  const output = await readFile((await download.path())!, 'utf8');
  for (const value of ['viewBox="0 0 256 256"', 'width="256"', 'height="256"', 'leaf-title', 'leaf-description', 'leaf-gradient', 'leaf-mask', 'url(#leaf-gradient)', 'url(#leaf-mask)', '#17634d']) {
    expect(output).toContain(value);
  }
  expect(output).not.toContain('<script');
  expect(byteLength(output)).toBeLessThan(byteLength(EXAMPLE_SVG));
  await expect(page.locator('.file-metrics').getByText(formatBytes(byteLength(output)), { exact: true })).toBeVisible();
});

test('all hostile fixtures are rejected before preview, execution, or network access', async ({ page }) => {
  const dialogs: string[] = [];
  const externalRequests: string[] = [];
  page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url()); });
  await page.goto('/');
  for (const fixture of hostileSvgs) {
    await test.step(fixture.name, async () => {
      await page.getByLabel('SVG source code', { exact: true }).fill(fixture.source);
      await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'failed');
      await expect(page.locator('#svg-error')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Optimize SVG' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
      await expect(page.locator('.preview-canvas img')).toHaveCount(0);
    });
  }
  expect(dialogs).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('UTF-8 metrics, exact input limit, unsupported files, and failure recovery', async ({ page }) => {
  await page.goto('/');
  const source = page.getByLabel('SVG source code', { exact: true });
  await source.fill(tinySvg);
  await optimized(page);
  await expect(page.locator('.file-metrics > div').first()).toContainText(formatBytes(byteLength(tinySvg)));
  const skeleton = '<svg xmlns="http://www.w3.org/2000/svg"><!--PADDING--><path d="M0 0h10"/></svg>';
  const exactLimit = skeleton.replace('PADDING', 'x'.repeat(MAX_INPUT_BYTES - byteLength(skeleton) + byteLength('PADDING')));
  expect(byteLength(exactLimit)).toBe(MAX_INPUT_BYTES);
  await page.getByLabel('Choose SVG file').setInputFiles({ name: 'limit.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(exactLimit) });
  // A 1 MiB input is validated and then optimized, which takes longer on a loaded CI machine.
  await optimized(page, 20000);
  await expect(page.locator('.file-metrics > div').first()).toContainText('1,048,576 B');
  await source.fill(exactLimit + ' ');
  await expect(page.locator('#svg-error')).toContainText('exceeds 1 MiB', { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await source.fill('<svg><path>');
  await expect(page.locator('#svg-error')).toContainText('valid SVG XML');
  await page.getByLabel('Choose SVG file').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from([0xff, 0xfe]) });
  await expect(page.locator('#svg-error')).toContainText('UTF-8');
  await page.getByLabel('Choose SVG file').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('fake') });
  await expect(page.locator('#svg-error')).toContainText('.svg extension');
  await example(page);
});

test('a larger output is honestly reported and missing SVG namespace is normalized', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('SVG source code', { exact: true }).fill('<svg/>');
  await optimized(page);
  await expect(page.locator('.comparisons')).toContainText('larger');
  await expect(page.getByLabel('Optimized SVG code')).toHaveValue(/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
});

test('precision reruns use the baseline and clear empties the workspace', async ({ page }) => {
  await page.goto('/');
  await example(page);
  await optimizedAt(page, 3);
  await page.getByLabel('Precision', { exact: true }).selectOption('2');
  await optimizedAt(page, 2);
  const low = await page.getByLabel('Optimized SVG code').inputValue();
  const before = await page.locator('img[alt="Before optimization, 256 pixels"]').getAttribute('src');
  await page.getByLabel('Precision', { exact: true }).selectOption('5');
  await optimizedAt(page, 5);
  const high = await page.getByLabel('Optimized SVG code').inputValue();
  expect(high).not.toBe(low);
  expect(high).toContain('65.12345');
  await expect(page.locator('img[alt="Before optimization, 256 pixels"]')).toHaveAttribute('src', before!);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'idle');
  await expect(page.getByLabel('SVG source code', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Precision', { exact: true })).toHaveValue('5');
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await expect(page.locator('.preview-canvas img')).toHaveCount(0);
});

test('cancellation, timeout, and changed input cannot publish an obsolete result', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: class extends Worker {
      postMessage(message: unknown) { if (!Reflect.get(window, 'holdSvgWorker')) super.postMessage(message); }
    } });
  });
  await page.goto('/');
  await example(page);
  const previous = await page.getByLabel('Optimized SVG code').inputValue();
  await page.evaluate(() => Reflect.set(window, 'holdSvgWorker', true));
  await page.getByLabel('Precision', { exact: true }).selectOption('5');
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Optimized SVG code')).toHaveValue(previous);
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeEnabled();
  await expect(page.getByLabel('Precision', { exact: true })).toHaveValue('3');
  // A retry is offered after a cancel; new input then replaces the held job and runs on its own.
  await page.getByRole('button', { name: 'Optimize SVG' }).click();
  await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'optimizing');
  await page.getByLabel('SVG source code', { exact: true }).fill(tinySvg);
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await expect(page.locator('#svg-error')).toContainText('longer than 5 seconds', { timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await page.evaluate(() => Reflect.set(window, 'holdSvgWorker', false));
  await page.getByRole('button', { name: 'Optimize SVG' }).click();
  await optimized(page);
});

test('file contents and filename stay local, refresh clears them, and preview URLs are released', async ({ page }) => {
  await page.addInitScript(() => {
    const urls = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); urls.add(url); return url; };
    URL.revokeObjectURL = url => { urls.delete(url); revoke(url); };
    Reflect.set(window, 'liveSvgUrls', urls);
  });
  await page.goto('/');
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push({ url: request.url(), method: request.method(), body: request.postData() }); });
  const secret = 'private-portfolio-sentinel';
  const content = tinySvg.replace('é🍃', secret);
  await page.getByLabel('Choose SVG file').setInputFiles({ name: `${secret}.svg`, mimeType: 'image/svg+xml', buffer: Buffer.from(content) });
  await optimized(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByLabel('SVG source code', { exact: true }).fill('');
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'liveSvgUrls').size)).toBe(0);
  expect(requests.every(request => request.url.startsWith('http://127.0.0.1:4173/') && request.method === 'GET' && request.body === null && !request.url.includes(secret))).toBe(true);
  await page.reload();
  await expect(page.getByLabel('SVG source code', { exact: true })).toHaveValue('');
  await expect(page.locator('.input-name')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('keyboard-only paste to download and accessible empty/result states', async ({ page }) => {
  await page.goto('/');
  // Audit the hydrated page: before hydration the controls are disabled and then fade to their enabled colours.
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeEditable();
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to SVG input' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeFocused();
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeEditable();
  await page.keyboard.insertText(tinySvg);
  await optimized(page);
  expect(await axeViolations(page)).toEqual([]);
  for (let count = 0; count < 12; count++) {
    if (await page.getByRole('button', { name: 'Download SVG' }).evaluate(element => element === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeFocused();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  expect((await download).suggestedFilename()).toBe('asset.optimized.svg');
});

test('360px layout keeps the main workflow usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await example(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Both previews fit side by side without a sideways scroll.
  for (const [left, right] of await page.locator('.preview-canvas').evaluateAll(elements =>
    elements.map(element => { const box = element.getBoundingClientRect(); return [box.left, box.right]; }))) {
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(360);
  }
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test('clipboard denial opens selectable output and announces a useful recovery', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => { throw new Error('Permission denied'); } },
  }));
  await page.goto('/');
  await example(page);
  await page.getByRole('button', { name: 'Copy code' }).click();
  await expect(page.getByLabel('Optimized SVG code')).toBeVisible();
  await expect(page.getByLabel('Optimized SVG code')).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable');
  expect(await page.getByLabel('Optimized SVG code').evaluate(element => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length;
  })).toBe(true);
});

test('clipboard button copies the current validated SVG', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native clipboard permissions are exercised in Chromium; denial recovery runs on all engines.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await example(page);
  const output = await page.getByLabel('Optimized SVG code').inputValue();
  await page.getByRole('button', { name: 'Copy code' }).click();
  await expect(page.getByRole('status')).toContainText('Copied optimized SVG code.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(output);
});

test('static shapes, clipping, text, and local xlink references survive export', async ({ page }) => {
  await page.goto('/');
  const source = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="240.123456" height="240" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet" aria-labelledby="drawing-title">
    <title id="drawing-title">Shapes and clipping</title>
    <defs><clipPath id="round-clip" clipPathUnits="userSpaceOnUse"><circle cx="120" cy="120" r="100"/></clipPath><path id="text-curve" d="M20 120 Q120 20 220 120"/></defs>
    <g clip-path="url(#round-clip)" fill="#17634d"><rect x="20" y="20" width="60" height="60"/><ellipse cx="130" cy="60" rx="30" ry="20"/><polygon points="20,100 80,100 50,140"/><polyline points="90,100 120,130 150,100" fill="none" stroke="#17634d"/><line x1="20" y1="160" x2="200" y2="160" stroke="#17634d"/></g>
    <text font-family="sans-serif" font-size="14"><textPath xlink:href="#text-curve">Local text</textPath></text><use href="#text-curve" fill="none" stroke="#17634d"/>
  </svg>`;
  await page.getByLabel('SVG source code', { exact: true }).fill(source);
  await optimized(page);
  const result = await page.getByLabel('Optimized SVG code').inputValue();
  for (const value of ['clipPath', 'url(#round-clip)', 'xlink:href="#text-curve"', 'Local text', '<rect', '<ellipse', '<polygon', '<polyline', '<line', 'width="240.123456"', 'preserveAspectRatio="xMidYMid meet"']) expect(result).toContain(value);
});

test('the SVG boundary rejects hostile content independently of CSP', async ({ browser }) => {
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  const dialogs: string[] = [];
  const external: string[] = [];
  page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith('http://127.0.0.1:4173/')) {
      external.push(url);
      void route.abort();
    } else void route.continue();
  });
  await page.goto('/');
  for (const fixture of hostileSvgs) {
    await page.getByLabel('SVG source code', { exact: true }).fill(fixture.source);
    await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'failed');
    await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
    await expect(page.locator('.preview-canvas img')).toHaveCount(0);
  }
  expect(dialogs).toEqual([]);
  expect(external).toEqual([]);
  await context.close();
});

test('dropping SVG files loads the first one and optimizes it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeEditable();
  const dataTransfer = await page.evaluateHandle(source => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([source], 'dropped-leaf.svg', { type: 'image/svg+xml' }));
    transfer.items.add(new File([source], 'second.svg', { type: 'image/svg+xml' }));
    return transfer;
  }, EXAMPLE_SVG);
  const workbench = page.locator('.workbench');
  await workbench.dispatchEvent('dragenter', { dataTransfer });
  await expect(workbench).toHaveAttribute('data-dragging', 'true');
  await expect(page.locator('.drop-overlay')).toBeVisible();
  await workbench.dispatchEvent('drop', { dataTransfer });
  await expect(workbench).not.toHaveAttribute('data-dragging');
  await optimized(page);
  await expect(page.locator('.input-name')).toContainText('dropped-leaf.svg');
  await expect(page.getByRole('status')).toContainText('Loaded the first SVG only.');
});

test('one main action per state and a switchable preview background', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('SVG source code', { exact: true })).toBeEditable();
  const mainAction = page.locator('.workbench .button.primary:enabled');
  await expect(mainAction).toHaveCount(1);
  await expect(mainAction).toHaveText('Choose file');
  await example(page);
  await expect(mainAction).toHaveCount(1);
  await expect(mainAction).toHaveText('Download SVG');
  await expect(page.locator('.preview-grid')).toHaveAttribute('data-bg', 'checker');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await expect(page.locator('.preview-grid')).toHaveAttribute('data-bg', 'dark');
  await page.getByRole('radio', { name: 'Light' }).check();
  await expect(page.locator('.preview-grid')).toHaveAttribute('data-bg', 'light');
  expect(await axeViolations(page)).toEqual([]);
});
