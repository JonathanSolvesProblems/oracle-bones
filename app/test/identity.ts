// The identity checks over a built site (quickened-app design: Testing Strategy, the identity
// test; criteria 9.1, 9.2, 9.3, 9.5). Pure functions over a folder, so the test can run them on a
// fresh build. Each problem names the file and what was found.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

export interface SiteFile { name: string; bytes: Buffer; }

const TEXT = new Set(['.html', '.js', '.css', '.svg', '.txt', '.json', '.webmanifest', '.xml', '.map']);
const BANNED_EXT = new Set(['.exe', '.com', '.dll']);

export function filesUnder(dir: string): SiteFile[] {
  if (!existsSync(dir)) return [];
  const out: SiteFile[] = [];
  const walk = (d: string): void => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out.push({ name: relative(dir, p).split(sep).join('/'), bytes: readFileSync(p) });
    }
  };
  walk(dir);
  return out;
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Each sentence of a text that holds the word FEMA: from the last sentence end, quote, backquote
 * or tag edge before the word to the next sentence end or delimiter after it.
 */
export function femaSentences(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\bFEMA\b/g)) {
    let a = m.index!;
    while (a > 0 && !/[`"<>]/.test(text[a - 1]!) && !(/[.!?]/.test(text[a - 2] ?? '') && /\s/.test(text[a - 1]!))) a--;
    let b = m.index! + 4;
    while (b < text.length && !/[`"<>]/.test(text[b]!) && !(/[.!?]/.test(text[b]!) && (b + 1 >= text.length || /[\s`"<]/.test(text[b + 1]!)))) b++;
    out.push(collapse(text.slice(a, Math.min(b + 1, text.length)).replace(/[`"<>]$/, '')));
  }
  return out;
}

export interface IdentityRules {
  /** Files whose content may not appear in the site (art/, the mascot's folder). */
  art: SiteFile[];
  /** Files of oracle/vendor/, whose content may not appear in the site. */
  vendor: SiteFile[];
  /** Texts a FEMA sentence may come from: the notice and the data sources (criterion 9.2). */
  femaAllowed: string[];
}

export function identityProblems(site: readonly SiteFile[], rules: IdentityRules): string[] {
  const problems: string[] = [];
  const artHashes = new Map(rules.art.map((f) => [sha(f.bytes), f.name]));
  const artNames = new Set(rules.art.map((f) => f.name.split('/').pop()!.toLowerCase()));
  const vendorHashes = new Map(rules.vendor.map((f) => [sha(f.bytes), f.name]));
  const allowed = rules.femaAllowed.map(collapse);
  for (const f of site) {
    const ext = extname(f.name).toLowerCase();
    const h = sha(f.bytes);
    if (BANNED_EXT.has(ext)) problems.push(`${f.name}: a ${ext} file`);
    if (vendorHashes.has(h)) problems.push(`${f.name}: the same content as oracle/vendor/${vendorHashes.get(h)}`);
    if (artHashes.has(h)) problems.push(`${f.name}: the same content as art/${artHashes.get(h)}`);
    if (artNames.has(f.name.split('/').pop()!.toLowerCase())) problems.push(`${f.name}: a file name from art/`);
    if (!TEXT.has(ext)) continue;
    const text = f.bytes.toString('utf-8');
    if (/\busa-[a-z]/.test(text)) problems.push(`${f.name}: a U.S. Web Design System class prefix (usa-)`);
    if (/official website of the United States/i.test(text)) problems.push(`${f.name}: the "official website of the United States" banner`);
    if (/kotsu/i.test(text)) problems.push(`${f.name}: the name Kotsu`);
    for (const s of femaSentences(text)) {
      if (!allowed.some((a) => a.includes(s))) problems.push(`${f.name}: a FEMA sentence not on the allowed list: "${s}"`);
    }
  }
  return problems;
}
