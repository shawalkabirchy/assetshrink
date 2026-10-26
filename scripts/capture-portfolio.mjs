import assert from 'node:assert/strict';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import os from 'node:os';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const directory = resolve('docs/portfolio');
await mkdir(directory, { recursive: true });
const versions = {};
for (const engine of [chromium, firefox, webkit]) {
  const instance = await engine.launch();
  versions[engine.name()] = instance.version();
  await instance.close();
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:4173');
await expect(page.getByRole('button', { name: 'Load example' })).toBeEnabled();
await page.screenshot({ path: join(directory, 'desktop-empty.png'), fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Load example' }).click();
await expect(page.getByRole('button', { name: 'Optimize SVG' })).toBeEnabled();
const source = await page.getByLabel('SVG source code', { exact: true }).inputValue();
await writeFile(join(directory, 'studio-leaf.svg'), source);
await page.evaluate(() => {
  const times = [];
  let start = 0;
  const workspace = document.querySelector('.workbench');
  new MutationObserver(() => {
    if (workspace.dataset.status === 'optimizing') start = performance.now();
    if (workspace.dataset.status === 'done' && start) {
      times.push(performance.now() - start);
      start = 0;
    }
  }).observe(workspace, { attributes: true, attributeFilter: ['data-status'] });
  Reflect.set(window, 'optimizationTimes', times);
});
for (let index = 0; index < 5; index++) {
  await page.getByRole('button', { name: 'Optimize SVG' }).click();
  await expect(page.locator('.workbench')).toHaveAttribute('data-status', 'done');
}
const output = await page.getByLabel('Optimized SVG code').inputValue();
assert(output.includes('leaf-title') && output.includes('leaf-mask'));
assert(Buffer.byteLength(output) < Buffer.byteLength(source));
await writeFile(join(directory, 'studio-leaf.optimized.svg'), output);
const baselineBytes = Number((await page.locator('.file-metrics > div').nth(1).locator('dd').innerText()).replace(/\D/g, ''));
const measurements = {
  recordedAt: new Date().toISOString(),
  environment: { os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, ramGiB: Math.round(os.totalmem() / 1024 ** 3), node: process.version, browsers: versions },
  fixture: 'studio-leaf.svg', precision: 3,
  sourceBytes: Buffer.byteLength(source), baselineBytes, resultBytes: Buffer.byteLength(output),
  optimizationStateDurationsMs: await page.evaluate(() => Reflect.get(window, 'optimizationTimes')),
  timingMethod: 'Five optimizing-to-done UI state transitions on the example fixture. Includes worker startup and output validation; excludes image decode. First run may include a cold module load. Not a general performance guarantee.',
};
assert.equal(measurements.optimizationStateDurationsMs.length, 5);
await writeFile(join(directory, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
await page.screenshot({ path: join(directory, 'desktop-result.png'), fullPage: true, animations: 'disabled' });
await page.setViewportSize({ width: 360, height: 800 });
assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await page.screenshot({ path: join(directory, 'phone-result.png'), fullPage: true, animations: 'disabled' });
await page.setViewportSize({ width: 1440, height: 1100 });
await page.getByLabel('SVG source code', { exact: true }).fill('<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:red" d="M0 0h10"/></svg>');
await expect(page.locator('#svg-error')).toContainText('presentation attributes');
await page.screenshot({ path: join(directory, 'unsupported-input.png'), fullPage: true, animations: 'disabled' });
await context.close();

const recording = await browser.newContext({ viewport: { width: 1440, height: 1100 }, recordVideo: { dir: directory, size: { width: 1440, height: 1100 } } });
const demo = await recording.newPage();
const video = demo.video();
await demo.goto('http://127.0.0.1:4173');
await expect(demo.getByRole('button', { name: 'Load example' })).toBeEnabled();
// Hold real workflow states long enough to read in the silent walkthrough.
await demo.waitForTimeout(4000);
await demo.getByRole('button', { name: 'Load example' }).click();
await expect(demo.getByRole('button', { name: 'Optimize SVG' })).toBeEnabled();
await demo.waitForTimeout(4500);
await demo.getByRole('button', { name: 'Optimize SVG' }).click();
await expect(demo.locator('.workbench')).toHaveAttribute('data-status', 'done');
await demo.waitForTimeout(6000);
await demo.getByLabel('Precision', { exact: true }).selectOption('5');
await expect(demo.locator('.workbench')).toHaveAttribute('data-status', 'done');
await demo.waitForTimeout(4500);
await demo.getByText('View optimized SVG code', { exact: false }).click();
await demo.getByLabel('Optimized SVG code').scrollIntoViewIfNeeded();
await demo.waitForTimeout(4500);
const downloaded = demo.waitForEvent('download');
await demo.getByRole('button', { name: 'Download SVG' }).click();
assert.equal((await downloaded).suggestedFilename(), 'studio-leaf.optimized.svg');
await demo.waitForTimeout(4500);
await demo.getByRole('button', { name: 'Reset', exact: true }).click();
await demo.waitForTimeout(2500);
await recording.close();
await rename(await video.path(), join(directory, 'walkthrough.webm'));
await browser.close();
console.log(JSON.stringify(measurements, null, 2));
console.log('Captured desktop/phone/error screens and the complete walkthrough in docs/portfolio.');
