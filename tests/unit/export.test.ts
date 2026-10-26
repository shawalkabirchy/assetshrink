import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

it('hashes actual inline scripts across exported pages and produces static security headers', () => {
  const directory = mkdtempSync(join(tmpdir(), 'assetshrink-export-test-'));
  try {
    mkdirSync(join(directory, 'out', 'nested'), { recursive: true });
    const inline = 'self.__next_f.push([1,"safe bootstrap"]);';
    const another = 'console.log("another page");';
    writeFileSync(join(directory, 'out', 'index.html'), `<script src="/app.js"></script><script>${inline}</script>`);
    writeFileSync(join(directory, 'out', 'nested', 'index.html'), `<script>${another}</script>`);
    const command = spawnSync(process.execPath, [resolve('scripts/finalize-export.mjs')], { cwd: directory, encoding: 'utf8' });
    expect(command.status, command.stderr).toBe(0);
    const headers = readFileSync(join(directory, 'out', '_headers'), 'utf8');
    for (const content of [inline, another]) {
      expect(headers).toContain(`'sha256-${createHash('sha256').update(content).digest('base64')}'`);
    }
    expect(headers).not.toContain(createHash('sha256').update('').digest('base64'));
    expect(headers).toContain("worker-src 'self'");
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).not.toContain('unsafe-eval');
  } finally {
    if (!directory.startsWith(resolve(tmpdir()) + sep)) throw new Error('Refusing cleanup outside the test temp root');
    rmSync(directory, { recursive: true, force: true });
  }
});
