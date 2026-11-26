// The service worker (quickened-app task 11.1; criteria 1.3, 1.12; design: Offline). A real build
// is made into a temporary folder; the precache list written into sw.js must equal the files of
// that build, sw.js left out, and sw.js must carry the version hash of those files.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { build } from 'vite';
import { PRECACHE_MARK, SW_FILE, versionHash } from '../build/serviceWorker.ts';

const APP = join(import.meta.dirname, '..');

function filesOf(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

describe('the service-worker plugin', () => {
  it('writes sw.js with the precache list of the build and its version hash', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'quickened-build-'));
    await build({ root: APP, configFile: join(APP, 'vite.config.ts'), logLevel: 'silent', build: { outDir, emptyOutDir: true } });
    const files = filesOf(outDir);
    expect(files).toContain(SW_FILE);
    expect(files).toContain('index.html');
    const sw = readFileSync(join(outDir, SW_FILE), 'utf-8');
    const m = new RegExp(`${PRECACHE_MARK} = (\\[.*?\\]);`).exec(sw);
    expect(m, 'sw.js has no precache list').not.toBeNull();
    const listed = (JSON.parse(m![1]!) as string[]).slice().sort();
    const shipped = files.filter((f) => f !== SW_FILE);
    expect(listed).toEqual(shipped);
    const hash = versionHash(shipped.map((name) => ({ name, bytes: readFileSync(join(outDir, name)) })));
    expect(sw).toContain(`"${hash}"`);
    expect(sw).not.toMatch(/^\s*(import|export)\b/m);
  }, 120_000);
  it('gives a different hash when a file changes, and the same for the same files in any order', () => {
    const a = { name: 'a.js', bytes: Buffer.from('a') };
    const b = { name: 'b.js', bytes: Buffer.from('b') };
    expect(versionHash([a, b])).toBe(versionHash([b, a]));
    expect(versionHash([a, b])).not.toBe(versionHash([a, { name: 'b.js', bytes: Buffer.from('c') }]));
  });
});
