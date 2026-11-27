// The identity test (quickened-app task 12.3; criteria 9.1, 9.2, 9.3, 9.5). A real build is made
// into a temporary folder and checked: no USWDS class prefix or federal banner, every FEMA
// sentence on the allowed list, nothing from art/ and no Kotsu, no .EXE, .COM or .DLL and no file
// with the content of one in oracle/vendor/ (when the folders exist).
import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { data } from 'virtual:quickened/data';
import { NOTICE } from '../src/ui/views/notice.ts';
import { ROOT } from './golden.ts';
import { femaSentences, filesUnder, identityProblems } from './identity.ts';
import { INTRO_FEMA_PIECES } from '../src/ui/views/intro.ts';

const APP = join(import.meta.dirname, '..');
/** Where FEMA may be named (criterion 9.2): the notice, and the data sources and their caveats. */
const FEMA_ALLOWED = [NOTICE, ...INTRO_FEMA_PIECES, ...data.sources.items.map((i) => i.text), ...data.sources.caveats, data.sources.mainDischarge, data.sources.cutoffDischarge];

describe('the identity of the built site', () => {
  it('has no federal mark, no mascot, no binary, and FEMA only where criterion 9.2 allows', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'quickened-identity-'));
    await build({ root: APP, configFile: join(APP, 'vite.config.ts'), logLevel: 'silent', build: { outDir, emptyOutDir: true } });
    const site = filesUnder(outDir);
    expect(site.length).toBeGreaterThan(0);
    const sentences = site.flatMap((f) => (/\.(js|html|css|txt|svg|json)$/.test(f.name) ? femaSentences(f.bytes.toString('utf-8')) : []));
    // The FEMA sentence list, for the person to read in the test's output.
    console.log(`FEMA sentences in the built site:\n${[...new Set(sentences)].map((s) => `- ${s}`).join('\n')}`);
    expect(sentences.length).toBeGreaterThan(0);
    expect(identityProblems(site, {
      art: filesUnder(join(ROOT, 'art')),
      vendor: filesUnder(join(ROOT, 'oracle', 'vendor')),
      femaAllowed: FEMA_ALLOWED,
    })).toEqual([]);
  }, 120_000);
  it('reads a FEMA sentence from a string as far as its full stop', () => {
    expect(femaSentences('x = `One. It is not a FEMA product. Two.`')).toEqual(['It is not a FEMA product.']);
    expect(femaSentences('<p>FEMA published QUICK-2 in 1995.</p>')).toEqual(['FEMA published QUICK-2 in 1995.']);
    expect(femaSentences('WV_FEMAR3_Southcentral')).toEqual([]);
  });
});
