// Flags against the captures (task 2.4). `extended_section` must agree with row 24 of the
// final capture for every irregular golden that has a result; `cut_off_area_counted` must be
// raised for nd-irr-000010 and sb-irr-000003 and no other irregular golden.
//
// Step-Backwater is not built yet, so for its goldens the water surface comes from the rule the
// design gives (a start below 1 is a slope and runs the Normal Depth search; above 1 it is the
// elevation), and the flag functions are applied to it directly.
import { describe, expect, it } from 'vitest';
import { solve } from '../src/solver/index.ts';
import { irregularFlags } from '../src/solver/flags.ts';
import { flowAt } from '../src/solver/geometry/irregular.ts';
import { irregularNormalWs, readIrregular } from '../src/solver/modes/normalDepthIrregular.ts';
import { readSingle } from '../src/solver/parse.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHauntings } from '../build/hauntings.ts';
import { finalCapture, golden, goldens, ROOT, type Golden } from './golden.ts';
import { HEADLINE_SEED, knownMissFields } from './knownMisses.ts';

const SB_PROMPTS = ['bank_left', 'bank_right', 'n_left', 'n_channel', 'n_right', 'discharge'];

function flagCodes(g: Golden): string[] {
  if (g.mode === 'normal_depth') {
    return solve({ mode: 'normal_depth', shape: 'irregular', inputs: g.inputs }).flags.map((f) => f.code);
  }
  const read = readIrregular(g.inputs, SB_PROMPTS);
  if (!read.ok) throw new Error(`${g.id} did not read`);
  const start = readSingle(g.inputs.sb_start!);
  const { section, discharge, lowest, points } = read.value;
  let ws = start;
  if (start < 1) {
    const found = irregularNormalWs(section, discharge, start, lowest);
    if (!found.ok) throw new Error(`${g.id} search failed`);
    ws = found.y;
  }
  return irregularFlags(points, ws, flowAt(section, ws).spans).map((f) => f.code);
}

const irregular = goldens().filter((g) => g.shape === 'irregular' && g.outcome === 'result');
const earlier = irregular.filter((g) => g.seed !== HEADLINE_SEED);
const batch = irregular.filter((g) => g.seed === HEADLINE_SEED);

describe('irregular flags', () => {
  // The count was typed as 27 before the headline batch (2026-11-26); it is read from the
  // goldens now, as the batch added irregular results.
  it('covers every irregular result golden', () => {
    expect(earlier.length).toBeGreaterThan(0);
    expect(batch.length).toBeGreaterThan(0);
    expect(irregular.length).toBe(earlier.length + batch.length);
  });
  for (const g of irregular) {
    it(`${g.id}: extended_section agrees with row 24`, () => {
      const row24 = finalCapture(g.id)![24]!;
      expect(flagCodes(g).includes('extended_section')).toBe(row24.includes('EXTENDED CROSS SECTION'));
    });
  }
  // The task named nd-irr-000010 and sb-irr-000003. The design's rule (the wet part at WS is
  // more than one span) also raises it for nd-irr-000014: at WS 134.28 the ground point at
  // station 408.39 (elevation 135.08) stands above the water inside the channel and leaves a
  // second pool from 428.5 to 498.9 ft. QUICK-2 counts that pool: its printed Top Wid `253` is
  // the two spans together (182.5 + 70.4 ft). So the flag is right there too.
  it('cut_off_area_counted is raised for nd-irr-000010, nd-irr-000014 and sb-irr-000003 only, of the goldens before the headline batch', () => {
    const raised = earlier.filter((g) => flagCodes(g).includes('cut_off_area_counted')).map((g) => g.id);
    expect(raised).toEqual(['nd-irr-000010', 'nd-irr-000014', 'sb-irr-000003']);
  });
  // Task 16.8, criterion 5.11 (2026-11-26): H-001's Flag line named the cases that raise the flag
  // before the headline batch only. It must name every golden that raises it now, read here from
  // the goldens with the same flagCodes, the haunting's own case apart.
  it("H-001's Flag line names every golden that raises cut_off_area_counted, and no other", () => {
    const h1 = readHauntings(readFileSync(join(ROOT, 'results', 'hauntings.md'), 'utf-8'), (id) => Object.keys(golden(id).printed)).hauntings.find((x) => x.id === 'H-001')!;
    const raised = irregular.filter((g) => flagCodes(g).includes('cut_off_area_counted')).map((g) => g.id).filter((id) => !h1.cases.includes(id));
    const named = [...new Set(h1.flag!.match(/\b(?:nd|cd|cc|sb)-[a-z]+-\d{6}\b/g) ?? [])];
    expect(named.sort()).toEqual(raised.sort());
    const inBatch = raised.filter((id) => batch.some((g) => g.id === id)).length;
    expect(h1.flag).toContain(`${inBatch} of the headline batch's ${batch.length} irregular results`);
  });
  // In the headline batch nobody has looked at each section, so the evidence is the one the
  // nd-irr-000014 note uses: where the flag is raised, QUICK-2's printed fields are the ones
  // Quickened prints counting every span, apart from the fields of a known miss.
  it('where the headline batch raises cut_off_area_counted, Quickened prints what QUICK-2 printed', () => {
    const raised = batch.filter((g) => flagCodes(g).includes('cut_off_area_counted'));
    for (const g of raised) {
      const r = solve({ mode: 'normal_depth', shape: 'irregular', inputs: g.inputs });
      const known = knownMissFields(g.id);
      for (const k of Object.keys(g.printed).filter((x) => !known.includes(x))) {
        expect(r.printed[k]?.trim(), `${g.id} ${k}`).toBe(g.printed[k]!.trim());
      }
    }
  });
});
