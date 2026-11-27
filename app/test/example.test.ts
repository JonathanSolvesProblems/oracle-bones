// The worked examples (quickened-app tasks 7.1 to 7.4; criteria 8.1 to 8.9). Each loads its
// golden's inputs text for text and calculates; the cut-off example shows H-001's exact values;
// one edit makes the job no longer the recorded case; the sources block names every source of
// 8.7, read from realdata/huntington-section-01.json where the file holds it.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from 'virtual:quickened/data';
import { edited } from '../src/ui/job.ts';
import { classify, runJob } from '../src/ui/state.ts';
import { calculatePage } from '../src/ui/views/calculate.ts';
import { EXAMPLES, exampleBlock, exampleJob, examplesView, NO_LONGER_RECORDED, SOURCES_HEADING } from '../src/ui/views/example.ts';
import { CUT_OFF_LINE, resultsModel, resultsView } from '../src/ui/views/results.ts';
import { findAll, h, textOf, type VNode } from '../src/ui/vnode.ts';
import { golden, ROOT } from './golden.ts';

const REAL = JSON.parse(readFileSync(join(ROOT, 'realdata', 'huntington-section-01.json'), 'utf-8'));
const [MAIN, CUTOFF] = EXAMPLES;

function calculated(origin: 'main_example' | 'cutoff_example') {
  const job = exampleJob(origin);
  const state = classify(job, runJob(job));
  if (state.kind !== 'result') throw new Error(`${origin} is not a result`);
  return { job, state, m: resultsModel(job, state) };
}

function shownPrinted(m: ReturnType<typeof resultsModel>): Record<string, string> {
  return Object.fromEntries([...m.inputs, ...m.outputs].map((r) => [r.field, r.text]));
}
const trimmed = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.trim()]));

describe('the worked examples', () => {
  it('offers two controls above the picker, the main example first (8.1)', () => {
    expect(EXAMPLES.map((e) => [e.origin, e.caseId])).toEqual([['main_example', 'nd-irr-000006'], ['cutoff_example', 'nd-irr-000010']]);
    const buttons = findAll(examplesView(), (n) => n.tag === 'button');
    expect(buttons.map((b) => [b.on.click?.type, b.on.click?.origin, textOf(b).trim()])).toEqual(EXAMPLES.map((e) => ['example', e.origin, e.label]));
    const page = calculatePage({ mode: null, shape: null, values: {}, rows: [], marked: new Set() }, { examples: examplesView() });
    // Criterion 10.3: the controls come before the calculator, whose picker is in the spread.
    const order = page.children.map((c) => (typeof c === 'string' ? '' : String(c.attrs.class ?? '')));
    expect(order.indexOf('examples')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('examples')).toBeLessThan(order.findIndex((c) => c.startsWith('spread')));
  });

  // Criterion 10.11 (2026-11-27): each example shows its section, and the loaded one shows it is loaded.
  it('each example button carries a small drawing of its own section, and only the loaded, unedited example is pressed', () => {
    for (const selected of [null, 'main_example', 'cutoff_example'] as const) {
      const buttons = findAll(examplesView(selected), (n) => n.tag === 'button');
      expect(buttons.map((b) => b.attrs['aria-pressed'])).toEqual(EXAMPLES.map((e) => (e.origin === selected ? 'true' : 'false')));
      for (const b of buttons) {
        const thumb = findAll(b, (n) => n.tag === 'svg' && n.attrs.class === 'thumb')[0]!;
        expect(thumb.attrs['aria-hidden']).toBe('true');
        expect(findAll(thumb, (n) => n.attrs.class === 'thumb-line')).toHaveLength(1);
        expect(findAll(thumb, (n) => String(n.attrs.class ?? '').startsWith('thumb-water')).length).toBeGreaterThan(0);
      }
    }
    // The two sections differ in their water: the second has the cut-off pocket.
    const [a, b] = findAll(examplesView(), (n) => n.tag === 'button').map((x) => findAll(x, (n) => String(n.attrs.class ?? '') === 'thumb-water cut-off').length);
    expect([a, b]).toEqual([0, 1]);
    const main = readFileSync(join(ROOT, 'app', 'src', 'ui', 'main.ts'), 'utf-8');
    expect(main).toContain('examplesView(loaded && origin === loaded ? loaded : null)');
  });

  // Criterion 10.10 (2026-11-27): the sources close under their heading, under the result once there is one.
  it('the sources block is closed under its heading, and sits under the result when there is one, else under the form', () => {
    const block = exampleBlock('main_example', 'main_example');
    const details = findAll(block, (n) => n.tag === 'details')[0]!;
    expect(details.attrs.open).toBeUndefined();
    expect(textOf(findAll(details, (n) => n.tag === 'summary')[0]!)).toBe(SOURCES_HEADING);
    // The note that the job changed stays outside the closed part.
    const changed = exampleBlock('main_example', 'typed');
    expect(textOf(findAll(changed, (n) => n.tag === 'p' && n.attrs.class === 'no-longer')[0]!)).toBe(NO_LONGER_RECORDED);
    expect(textOf(findAll(changed, (n) => n.tag === 'details')[0]!)).not.toContain(NO_LONGER_RECORDED);
    const s = { mode: 'normal_depth' as const, shape: 'irregular' as const, values: {}, rows: [], marked: new Set<string>() };
    const where = (page: VNode) => findAll(page, (n) => n.tag === 'section' && n.attrs.class !== 'example-sources' && findAll(n, (x) => x.attrs.class === 'example-sources').length > 0)
      .map((n) => n.attrs.class).filter((c) => c === 'sketch' || c === 'field-notes');
    expect(where(calculatePage(s, { afterForm: block, results: h('p', {}, 'result') }))).toEqual(['sketch']);
    expect(where(calculatePage(s, { afterForm: block }))).toEqual(['field-notes']);
  });

  it('main example: nd-irr-000006\'s inputs key for key and text for text; its printed fields and no exact value (8.2, 8.3)', () => {
    const job = exampleJob('main_example');
    const g = golden(MAIN!.caseId);
    expect([job.mode, job.shape, job.origin]).toEqual([g.mode, g.shape, 'main_example']);
    expect(job.inputs).toEqual(g.inputs);
    const { state, m } = calculated('main_example');
    expect(shownPrinted(m)).toEqual(trimmed(g.printed));
    expect(state.exact).toBeNull();
    expect(findAll(resultsView(m), (n) => n.attrs['data-exact'] !== undefined)).toEqual([]);
  });

  it('cut-off example: nd-irr-000010\'s inputs, which differ from the main example\'s only in discharge (8.4)', () => {
    const job = exampleJob('cutoff_example');
    const g = golden(CUTOFF!.caseId);
    expect(job.inputs).toEqual(g.inputs);
    const main = golden(MAIN!.caseId).inputs;
    const keys = new Set([...Object.keys(main), ...Object.keys(g.inputs)]);
    expect([...keys].filter((k) => main[k] !== g.inputs[k])).toEqual(['discharge']);
  });

  it('cut-off example: its printed fields, the cut-off line and H-001\'s exact values on their fields\' rows (8.5)', () => {
    const { state, m } = calculated('cutoff_example');
    const g = golden(CUTOFF!.caseId);
    expect(shownPrinted(m)).toEqual(trimmed(g.printed));
    const cutOffRows = m.outputs.filter((r) => r.notes.includes(CUT_OFF_LINE)).map((r) => r.field).sort();
    expect(cutOffRows).toEqual(['area', 'top_width', 'wet_perimeter']);
    // On the screen the line is written once (criterion 10.12).
    expect(textOf(resultsView(m)).split(CUT_OFF_LINE).length - 1).toBe(1);
    const line = data.hauntings.find((h) => h.id === 'H-001')!.exactByField.find((x) => x.caseId === CUTOFF!.caseId)!;
    expect(state.exact?.haunting).toBe('H-001');
    const exact = Object.fromEntries(m.outputs.filter((r) => r.exact !== null).map((r) => [r.field, r.exact]));
    expect(exact).toEqual(line.values);
  });

  for (const e of EXAMPLES) {
    it(`${e.origin}: after one edit the job is no longer the recorded case and shows no exact value (8.6)`, () => {
      const job = exampleJob(e.origin);
      expect(textOf(exampleBlock(e.origin, job.origin))).not.toContain(NO_LONGER_RECORDED);
      for (const key of ['discharge', 'n_channel', 'sta_05', 'elev_20']) {
        const after = edited(job, key, `${job.inputs[key]}0`);
        expect(after.origin).toBe('typed');
        expect(after.inputs[key]).toBe(`${job.inputs[key]}0`);
        expect(textOf(exampleBlock(e.origin, after.origin))).toContain(NO_LONGER_RECORDED);
        const state = classify(after, runJob(after));
        if (state.kind === 'result') expect(state.exact).toBeNull();
      }
    });
  }
});

describe('the sources block (8.7 to 8.9)', () => {
  const blocks: [string, VNode][] = EXAMPLES.map((e) => [e.origin, exampleBlock(e.origin, e.origin)]);
  const countyState = String(REAL.stream.county_state).split(' (')[0]!;
  const firm = REAL.fema_flood_zone.attributes_esri_copy[0].DFIRM_ID;

  for (const [origin, block] of blocks) {
    it(`${origin}: names every source of 8.7, read from the realdata file where it holds it`, () => {
      const text = textOf(block);
      for (const part of [
        REAL.stream.name, countyState, `Zone ${REAL.fema_flood_zone.zone}`, firm, REAL.stream.nhd_permanent_identifier,
        REAL.slope.dem_rasters[0], 'USGS 3DEP 1 m lidar DEM', 'Elevation Point Query Service',
        REAL.bank_stations_suggested.label, String(REAL.bank_stations_suggested.left_bank_station_ft), String(REAL.bank_stations_suggested.right_bank_station_ft),
        REAL.slope.label, String(REAL.slope.recommended_estimate_ft_per_ft),
        'Chow (1959)', 'HEC-RAS Hydraulic Reference Manual', 'Table 3-1', 'normal column', 'without seeing the site',
        ...REAL.caveats,
      ]) expect(text, part).toContain(part);
    });
  }

  it('main example: the 1-percent discharge sentence with the file\'s estimate, interval and citation (8.8)', () => {
    const text = textOf(blocks[0]![1]);
    const d = REAL.discharge;
    const cfs = (x: number) => x.toLocaleString('en-US');
    for (const part of [
      `${cfs(d.q100_cfs)} cfs`, 'StreamStats', '1-percent AEP', d.regression_region.code, `${d.drainage_area_mi2.toFixed(2)} mi²`,
      `90% prediction interval ${cfs(d.prediction_interval_90pct_cfs.lower)} to ${cfs(d.prediction_interval_90pct_cfs.upper)} cfs`,
      'regional regression estimate', d.citation,
    ]) expect(text, part).toContain(part);
    expect(text).not.toContain('test value');
  });

  it('cut-off example: the test-discharge sentence, with no range of elevations (8.9, amended 2026-11-26)', () => {
    const text = textOf(blocks[1]![1]);
    const d = REAL.discharge;
    const cfs = (x: number) => x.toLocaleString('en-US');
    const q = cfs(Number(golden(CUTOFF!.caseId).inputs.discharge));
    expect(Number(golden(CUTOFF!.caseId).inputs.discharge)).toBeGreaterThan(d.prediction_interval_90pct_cfs.upper);
    for (const part of [
      `${q} cfs is a test value`, 'fill the cut-off low ground', 'not a flood estimate',
      `above the 1-percent estimate's 90% prediction interval (${cfs(d.prediction_interval_90pct_cfs.lower)} to ${cfs(d.prediction_interval_90pct_cfs.upper)} cfs)`,
    ]) expect(text, part).toContain(part);
    expect(text).not.toContain('StreamStats 1-percent AEP flood estimate for the site');
    expect(text).not.toMatch(/between \d/);
  });
});
