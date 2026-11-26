// The service-worker plugin (quickened-app design: Offline; criteria 1.3, 1.12). At
// generateBundle it lists every file of the build, the public folder's included, and writes sw.js
// from src/sw.ts with that list and a version hash of the files' contents. The worker precaches
// the list; a new build with any changed file gets a new hash, so the old cache is dropped.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { Plugin } from 'vite';

export const SW_FILE = 'sw.js';
/** The name the precache list is bound to in sw.js. */
export const PRECACHE_MARK = 'const PRECACHE';
const SOURCE = fileURLToPath(new URL('../src/sw.ts', import.meta.url));

/** A short hash of the files' names and contents, independent of their order. */
export function versionHash(files: readonly { name: string; bytes: Uint8Array }[]): string {
  const h = createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    h.update(f.name).update('\0').update(f.bytes).update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function publicFiles(dir: string): { name: string; bytes: Uint8Array }[] {
  const out: { name: string; bytes: Uint8Array }[] = [];
  const walk = (d: string): void => {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const f of entries) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out.push({ name: relative(dir, p).split(sep).join('/'), bytes: readFileSync(p) });
    }
  };
  walk(dir);
  return out;
}

/** sw.js: the precache list and version, then src/sw.ts with its types stripped. */
export function workerSource(precache: readonly string[], version: string): string {
  const js = ts.transpileModule(readFileSync(SOURCE, 'utf-8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false },
  }).outputText;
  return `${PRECACHE_MARK} = ${JSON.stringify(precache)};\nconst VERSION = ${JSON.stringify(version)};\n${js}`;
}

export function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'quickened-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const files = new Map<string, Uint8Array>();
      for (const f of publicDir ? publicFiles(publicDir) : []) files.set(f.name, f.bytes);
      for (const [name, out] of Object.entries(bundle)) {
        const body = out.type === 'chunk' ? out.code : out.source;
        files.set(name, typeof body === 'string' ? Buffer.from(body) : body);
      }
      files.delete(SW_FILE);
      const list = [...files.keys()].sort();
      const version = versionHash(list.map((name) => ({ name, bytes: files.get(name)! })));
      this.emitFile({ type: 'asset', fileName: SW_FILE, source: workerSource(list, version) });
    },
  };
}
