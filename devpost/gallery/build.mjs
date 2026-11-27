// Renders the gallery slides for the submission page.
//
// Every number on a slide is read from a results file or counted from the repository when this
// runs, and every picture of the app is taken from the running site, so a changed result
// re-renders the slides. A number that cannot be found stops the build; nothing is typed here.
// The one still that is not taken live is frames/refusal-clean.png, a capture of the Kiro window
// on 2026-11-26, in a new folder with only the power installed (cropped, not edited).
//
// Usage, from the repository root:
//   npm --prefix app run build
//   node app/node_modules/vite/bin/vite.js preview app --port 4173 --strictPort     (keep running)
//   node devpost/gallery/build.mjs [--url http://localhost:4173/] [--only 01,04] [--no-captures]
//     [--pick what-it-is,headline,... --out devpost/preview]   (those slides only, numbered 1 to n)
//
// Output: devpost/gallery/out/NN-name.png, 3000 x 2000 (3:2), and out/index.json with each
// slide's caption for the submission form.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = join(HERE, 'out');
const CAP = join(HERE, 'captures');
const HTML = join(OUT, 'html');
for (const d of [OUT, CAP, HTML]) mkdirSync(d, { recursive: true });

const args = process.argv.slice(2);
const argOf = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const BASE = argOf('--url', process.env.QUICKENED_URL ?? 'http://localhost:4173/');
const ONLY = argOf('--only', '')?.split(',').filter(Boolean) ?? [];
// --pick name,name,...: only these slides, in this order, numbered 1 to n of n (the submission's preview set);
// --out <dir>: where the pictures and index.json go, from the repository root (default devpost/gallery/out).
const PICK = argOf('--pick', '')?.split(',').filter(Boolean) ?? [];
const OUT_DIR = argOf('--out', '') ? resolve(ROOT, argOf('--out', '')) : OUT;
mkdirSync(OUT_DIR, { recursive: true });
const SKIP_CAPTURES = args.includes('--no-captures');

// ---------------------------------------------------------------------------------------------
// Data: read from the results files and the repository. `must` stops the build on a miss.
// ---------------------------------------------------------------------------------------------

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const must = (re, text, what) => { const m = re.exec(text); if (!m) throw new Error(`gallery: cannot find ${what}`); return m; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const thousands = (n) => Number(n).toLocaleString('en-US');

const MAIN_CASE = 'nd-irr-000006';

function loadData() {
  const headline = read('results/headline.md');
  const [, matched, stored] = must(/^Cases: (\d+) of (\d+)$/m, headline, 'the Cases line of results/headline.md');
  const [, runDate] = must(/^Run: (\d{4}-\d{2}-\d{2})$/m, headline, 'the Run line of results/headline.md');
  const [, drawn] = must(/\| Drawn by the generator[^|]*\| (\d+) \|/, headline, 'the drawn count');
  const [, notFinished] = must(/\| Not finished within the runner's wait \| (\d+) \|/, headline, 'the not-finished count');
  const [, solverCommit] = must(/at their last commit, `([0-9a-f]{7,})/, headline, "the solver's commit");
  const batchPart = headline.slice(headline.indexOf('## Every miss'), headline.indexOf('## The earlier goldens'));
  const batchMissIds = new Set([...batchPart.matchAll(/^\| ([a-z]{2}-[a-z]+-\d{6}) \|/gm)].map((m) => m[1]));
  const misses = Number(stored) - Number(matched);
  if (batchMissIds.size !== misses) throw new Error(`gallery: headline.md lists ${batchMissIds.size} missed cases, the counts give ${misses}`);

  const ablation = read('results/ablation-manual-only.md');
  const row = must(/\| The headline batch \(seed 201\) \| (\d+) \| (\d+) \(([\d.]+%)\) \| (\d+) \(([\d.]+%)\) \| (\d+) \(([\d.]+%)\) \|/, ablation, "the ablation's batch row");
  if (row[1] !== stored || row[6] !== matched) throw new Error('gallery: the ablation file and the headline file disagree on the batch');
  const median = must(/\| Median \| ([\d.]+%) \|/, ablation, "the ablation's median difference");
  const under1 = must(/\| Under 1% \| \d+ \((\d+%)\)/, ablation, "the ablation's share under 1%");
  const run2Credits = must(/\| Run 2 \| ([\d.]+) \|/, ablation, "run 2's credits");

  const missRows = [...batchPart.matchAll(/^\| ([a-z]{2}-[a-z]+-\d{6}) \| [^|]+ \| ([a-z_]+) \| `([^`]*)` \| `([^`]*)` \|$/gm)]
    .map((m) => ({ id: m[1], field: m[2], quick2: m[3], quickened: m[4] }));
  const known = JSON.parse(read('results/known-misses.json'));
  const classes = known.classes.filter((c) => c.limits).map((c) => {
    const ids = Object.keys(c.cases);
    const inBatch = ids.filter((id) => batchMissIds.has(id));
    const example = missRows.find((r) => inBatch.includes(r.id));
    if (!example) throw new Error(`gallery: no row of results/headline.md shows a miss of class ${c.id}`);
    return { id: c.id, title: c.limits, what: c.what, inBatch: inBatch.length, all: ids.length, example };
  });
  const classed = classes.reduce((n, c) => n + c.inBatch, 0);
  if (classed !== misses) throw new Error(`gallery: the known-miss classes hold ${classed} batch cases, the headline has ${misses} misses`);

  const real = JSON.parse(read('realdata/huntington-section-01.json'));
  const example = {
    stream: real.stream.name,
    county: real.stream.county_state.replace(/\s*\(.*$/, ''),
    stations: real.cross_section.n_stations,
    dem: must(/^(USGS 3DEP [^,]+)/, real.cross_section.dem_source, "the section's elevation source")[1],
    discharge: real.discharge.q100_cfs,
    statistic: real.discharge.statistic.replace(/\s*\(.*$/, ''),
  };

  const dirs = (rel) => readdirSync(join(ROOT, rel)).filter((f) => statSync(join(ROOT, rel, f)).isDirectory());
  const files = (rel, ext) => readdirSync(join(ROOT, rel)).filter((f) => f.endsWith(ext));
  const specs = dirs('.kiro/specs');
  let criteria = 0;
  for (const s of specs) {
    for (const f of ['requirements.md', 'bugfix.md']) {
      const p = join(ROOT, '.kiro/specs', s, f);
      if (existsSync(p)) criteria += (readFileSync(p, 'utf8').match(/^\d+\.\s+(WHEN|WHILE|IF|WHERE|THE SYSTEM)\b/gm) ?? []).length;
    }
  }
  const python = existsSync(join(ROOT, '.venv/Scripts/python.exe')) ? join(ROOT, '.venv/Scripts/python.exe') : 'python';
  const tools = execFileSync(python, ['-c', 'from oracle.schemas import TOOLS; print(len(TOOLS))'], { cwd: ROOT }).toString().trim();
  const kiro = {
    specs: specs.length,
    criteria,
    hooks: files('.kiro/hooks', '.json').length,
    steering: files('.kiro/steering', '.md').length,
    agents: files('.kiro/agents', '.md').length,
    workflows: files('.kiro/workflows', '.json').length,
    tools: Number(tools),
    goldens: files('oracle/goldens/cases', '.json').length,
    commits: Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: ROOT }).toString().trim()),
  };

  // The 1995 program's own last screen for the main example, as the recorder stored it.
  const capDir = join(ROOT, 'oracle/goldens/captures', MAIN_CASE);
  const numberOf = (f) => Number(/^screen-(\d+)\.txt$/.exec(f)[1]);
  const lastScreen = readdirSync(capDir).filter((f) => /^screen-\d+\.txt$/.test(f)).sort((a, b) => numberOf(a) - numberOf(b)).at(-1);
  const screenLines = readFileSync(join(capDir, lastScreen), 'utf8').split(/\r?\n/);
  while (screenLines.length && !screenLines[0].trim()) screenLines.shift();
  while (screenLines.length && !screenLines.at(-1).trim()) screenLines.pop();
  const indent = Math.min(...screenLines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const screen = screenLines.map((l) => l.slice(indent).trimEnd()).join(String.fromCharCode(10));
  const golden = JSON.parse(read(`oracle/goldens/cases/${MAIN_CASE}.json`));
  const recorded = golden.recorded_at.slice(0, 10);
  const wsElev = golden.printed.ws_elev.trim();

  // Every golden must match the recorder's manifest, or the slide that says so is not built.
  execFileSync(python, ['scripts/check_goldens.py'], { cwd: ROOT, stdio: 'pipe' });

  // The held-out record is quoted whole or not at all: every row of its table must parse.
  const heldOutPath = join(ROOT, 'results/held-out.md');
  let heldOut = null;
  if (existsSync(heldOutPath)) {
    const text = readFileSync(heldOutPath, 'utf8');
    const tableRows = text.split(/\r?\n/).filter((l) => l.startsWith('|')).slice(2);
    heldOut = tableRows.map((l) => {
      const c = l.slice(1, -1).split('|').map((x) => x.trim());
      if (c.length !== 4 || !/^A-\d{3}$/.test(c[0]) || !/^[0-9a-f]{7}(, [0-9a-f]{7})*$/.test(c[1]) || !/^\d+ of \d+$/.test(c[2])) throw new Error(`gallery: cannot read this row of results/held-out.md: ${l}`);
      return { round: c[0], commit: c[1], right: c[2], what: c[3] };
    });
    if (!heldOut.length) throw new Error('gallery: results/held-out.md has no rows');
    const under = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('|') && !l.startsWith('#'));
    heldOut.note = under.join(' ');
  }

  return {
    matched: Number(matched), stored: Number(stored), drawn: Number(drawn), notFinished: Number(notFinished), misses, runDate, solverCommit,
    run2: Number(row[2]), run2Share: row[3], run1: Number(row[4]), median: median[1], under1: under1[1], run2Credits: run2Credits[1],
    classes, example, kiro, heldOut, screen, recorded, wsElev,
  };
}

// ---------------------------------------------------------------------------------------------
// The browser: headless Edge over the DevTools protocol, with a new profile every run. The app's
// service worker serves its cache first, so an old profile would show the previous build.
// ---------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!EDGE) throw new Error('gallery: no Edge or Chromium found');
const PORT = 9347;

async function openBrowser() {
  const profile = mkdtempSync(join(tmpdir(), 'quickened-gallery-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) { proc.kill(); throw new Error('gallery: the browser did not start'); }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Runtime.enable');
  const js = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(`gallery: page script failed: ${r.result.exceptionDetails.text} in ${expression.slice(0, 80)}`);
    return r.result?.result?.value;
  };
  const close = async () => {
    ws.close(); proc.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold a file */ }
  };
  return { send, js, close };
}

const clickNth = (selector, n) => `(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${n}];
  if (!el) throw new Error('missing ' + ${JSON.stringify(selector)} + ' #${n}'); el.click(); return 'ok'; })()`;

// What to photograph in the app. `clip` names an element; `maxHeight` cuts a long one; `pad`
// adds paper around it. Widths are CSS pixels; pictures are taken at twice that.
const CAPTURES = {
  'drawing-main': { width: 1280, height: 900, steps: [], union: '.hero svg.reach-block' },
  'tables-main': { width: 1280, height: 900, steps: [clickNth('.example', 0)], union: '.state-result table.printed' },
  'drawing-cutoff': { width: 1280, height: 900, steps: [clickNth('.example', 1)], union: '.state-result .main-figure, .state-result svg.reach-block' },
  'flags-cutoff': { width: 1280, height: 900, steps: [clickNth('.example', 1)], union: '.state-result .flags' },
  'limits-h001': { width: 700, height: 900, hash: '#/limits', union: '#haunting-H-001' },
  'phone-main': { width: 375, height: 812, mobile: true, steps: [clickNth('.example', 0)], scrollTo: '.state-result', viewport: true },
  'print-main': { width: 816, height: 1056, steps: [clickNth('.example', 0)], print: true, viewport: true, top: true },
};

/** The rectangle around every element matching `selector`, in page coordinates, or null. */
const unionOf = (selector) => `(() => { const els = [...document.querySelectorAll(${JSON.stringify(selector)})]; if (!els.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of els) { const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    x0 = Math.min(x0, r.left + scrollX); y0 = Math.min(y0, r.top + scrollY); x1 = Math.max(x1, r.right + scrollX); y1 = Math.max(y1, r.bottom + scrollY); }
  return isFinite(x0) ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null; })()`;

async function takeCaptures(browser) {
  const { send, js } = browser;
  for (const [name, c] of Object.entries(CAPTURES)) {
    await send('Emulation.setDeviceMetricsOverride', { width: c.width, height: c.height, deviceScaleFactor: 2, mobile: Boolean(c.mobile) });
    await send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(150);
    await send('Page.navigate', { url: BASE + (c.hash ?? '') });
    await sleep(1200);
    for (const step of c.steps ?? []) { await js(step); await sleep(400); }
    if (c.print) {
      await send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] });
      await js("window.dispatchEvent(new Event('beforeprint')), 'ok'");
      await sleep(500);
    }
    if (c.scrollTo) { await js(`document.querySelector(${JSON.stringify(c.scrollTo)}).scrollIntoView({ block: 'start' }), 'ok'`); await sleep(300); }
    let clip;
    if (c.viewport) {
      if (c.top) { await js("scrollTo(0, 0), 'ok'"); await sleep(200); }
      const y = c.top ? 0 : await js('scrollY');
      clip = { x: 0, y, width: c.width, height: c.height, scale: 1 };
    } else {
      const r = await js(unionOf(c.union));
      if (!r) throw new Error(`gallery: ${name}: nothing matches ${c.union} at ${BASE}${c.hash ?? ''}`);
      const pad = c.pad ?? 12;
      clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + 2 * pad, height: r.height + 2 * pad, scale: 1 };
    }
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
    if (!shot.result?.data) throw new Error(`gallery: ${name}: no picture`);
    writeFileSync(join(CAP, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log(`captured ${name} ${Math.round(clip.width)} x ${Math.round(clip.height)}`);
  }
}

// ---------------------------------------------------------------------------------------------
// The slides. Each returns { name, alt, body } and reads only `d`, the data loaded above.
// ---------------------------------------------------------------------------------------------

const tokens = read('app/src/ui/styles/tokens.css');
const token = (name) => must(new RegExp(`--${name}:\\s*([^;]+);`), tokens, `the ${name} token`)[1].trim();
const fontUrl = (file) => pathToFileURL(join(ROOT, 'app/public/fonts', file)).href;
const capUrl = (name) => pathToFileURL(join(CAP, `${name}.png`)).href;
const frameUrl = (name) => pathToFileURL(join(HERE, 'frames', name)).href;

const CSS = `
@font-face { font-family: 'IBM Plex Sans'; src: url('${fontUrl('IBMPlexSans-Regular-Latin1.woff2')}') format('woff2'); font-weight: 400; }
@font-face { font-family: 'IBM Plex Sans'; src: url('${fontUrl('IBMPlexSans-SemiBold-Latin1.woff2')}') format('woff2'); font-weight: 600; }
@font-face { font-family: 'IBM Plex Sans Condensed'; src: url('${fontUrl('IBMPlexSansCondensed-Medium-Latin1.woff2')}') format('woff2'); font-weight: 500; }
@font-face { font-family: 'IBM Plex Mono'; src: url('${fontUrl('IBMPlexMono-Regular-Latin1.woff2')}') format('woff2'); font-weight: 400; }
:root { --paper: ${token('canvas')}; --rule: ${token('rule-line')}; --grid: ${token('rule-line')}; --ink: ${token('ink')}; --muted: ${token('ink-muted')};
  --pencil: ${token('water-line')}; --water: ${token('water')}; --water-fill: ${token('water-top')}; --ground: ${token('cut-face')}; --gauge: ${token('gauge')};
  --label: 'IBM Plex Sans Condensed', 'Arial Narrow', sans-serif; --body: 'IBM Plex Sans', system-ui, sans-serif; --mono: 'IBM Plex Mono', ui-monospace, monospace; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1500px; height: 1000px; overflow: hidden; }
body { background: var(--paper); color: var(--ink); font: 400 24px/32px var(--body); position: relative;
  background-image: linear-gradient(to bottom, transparent 39px, color-mix(in srgb, var(--rule) 55%, transparent) 39px, color-mix(in srgb, var(--rule) 55%, transparent) 40px);
  background-size: 100% 40px; }
/* A staff gauge down the left edge, as the app's charter makes the vertical scale: a white plate,
   black E-marks a unit apart. */
body::before { content: ''; position: absolute; left: 62px; top: 0; bottom: 0; width: 22px; background:
  repeating-linear-gradient(to bottom, var(--ink) 0 4px, transparent 4px 8px, var(--ink) 8px 12px, transparent 12px 16px, var(--ink) 16px 20px, transparent 20px 40px) 4px 0 / 10px 100% no-repeat,
  linear-gradient(var(--ink), var(--ink)) 4px 0 / 3px 100% no-repeat, var(--gauge); border-left: 1px solid var(--rule); border-right: 1px solid var(--rule); }
.sheet { position: absolute; inset: 0; padding: 44px 64px 40px 124px; display: flex; flex-direction: column; }
.top { display: flex; justify-content: space-between; align-items: baseline; font: 500 20px/24px var(--label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.top b { color: var(--ink); font-weight: 500; letter-spacing: 0.16em; }
h1 { font: 600 60px/66px var(--body); letter-spacing: -0.01em; margin-top: 26px; max-width: 1240px; text-wrap: balance; }
h1 em { font-style: normal; color: var(--pencil); }
.lede { font: 400 28px/40px var(--body); color: var(--ink); margin-top: 18px; max-width: 1180px; text-wrap: pretty; }
.main { flex: 1; min-height: 0; display: flex; gap: 40px; margin-top: 30px; align-items: stretch; }
.col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.shot { border: 2px solid var(--ink); background: var(--paper); overflow: hidden; position: relative; flex: 1; min-height: 0; }
.shot img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top left; }
.shot.contain img { object-fit: contain; object-position: center; }
.shot.dark { background: #1b1a22; border-color: var(--ink); }
.shot.old { background: var(--ink); color: var(--paper); display: flex; align-items: center; justify-content: center; }
.shot.old pre { font: 400 16.5px/21px var(--mono); margin: 0; white-space: pre; flex: none; }
.shot.old pre b { font-weight: 400; background: var(--paper); color: var(--ink); padding: 1px 3px; margin: 0 -3px; }
.tag { font: 500 18px/24px var(--label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.tag b { color: var(--ink); font-weight: 500; }
/* The title block of a drawing sheet: where each slide names its source. */
.block { margin-top: 24px; border: 2px solid var(--ink); display: grid; grid-template-columns: auto 1fr; background: var(--paper); }
.block div { padding: 9px 16px; border-bottom: 1px solid var(--ink); }
.block div:nth-last-child(-n+2) { border-bottom: 0; }
.block .k { font: 500 16px/24px var(--label); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); border-right: 1px solid var(--ink); white-space: nowrap; }
.block .v { font: 400 18px/24px var(--mono); }
.foot { margin-top: 14px; font: 400 16px/22px var(--body); color: var(--muted); display: flex; justify-content: space-between; gap: 24px; }
.foot .mark { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.foot .mark img { width: 42px; height: 42px; margin: -9px 0 -11px; }
.figure { font: 400 250px/230px var(--mono); letter-spacing: -0.04em; color: var(--ink); white-space: nowrap; }
.figure small { font: 400 84px/90px var(--mono); color: var(--muted); letter-spacing: -0.02em; margin-left: 10px; }
.figure-label { font: 500 24px/30px var(--label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-top: 14px; }
.bars { display: grid; grid-template-columns: max-content 1fr; column-gap: 24px; row-gap: 26px; align-items: center; width: 100%; }
.bars .name { font: 400 26px/32px var(--body); }
.bars .name small { display: block; font: 400 19px/26px var(--body); color: var(--muted); }
.bars .track { position: relative; height: 72px; border: 2px solid var(--ink); background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--rule) calc(10% - 1px) 10%); }
.bars .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--water); }
.bars .fill.weak { background: var(--pencil); }
.bars .n { position: absolute; top: 12px; font: 400 40px/48px var(--mono); }
table.t { border-collapse: collapse; width: 100%; font: 400 22px/30px var(--body); }
table.t th { font: 500 17px/24px var(--label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; padding: 6px 14px 6px 0; border-bottom: 2px solid var(--ink); }
table.t td { padding: 11px 14px 11px 0; border-bottom: 1px solid var(--ink); vertical-align: top; }
table.t td.num { font: 400 30px/30px var(--mono); white-space: nowrap; width: 1%; padding-right: 26px; }
table.t td.mono { font: 400 20px/30px var(--mono); white-space: nowrap; }
table.t.compact { font: 400 18.5px/24px var(--body); }
table.t.compact th { font-size: 14px; line-height: 18px; padding: 2px 12px 4px 0; }
table.t.compact td { padding: 5px 14px 5px 0; }
table.t.compact td.num { font: 400 24px/24px var(--mono); padding-right: 18px; }
table.t.compact td.mono { font: 400 16.5px/24px var(--mono); }
p.under { font: 400 18.5px/25px var(--body); color: var(--muted); margin-top: 10px; }
h1.small { font-size: 46px; line-height: 52px; margin-top: 18px; }
blockquote { font: 400 34px/50px var(--body); max-width: 1220px; text-wrap: pretty; border-left: 6px solid var(--water); padding-left: 32px; }
.who { margin-top: 26px; padding-left: 38px; font: 500 22px/30px var(--label); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.who b { color: var(--ink); font-weight: 500; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 2px solid var(--ink); width: 100%; align-self: start; }
.stats div { padding: 18px 20px 16px; border-right: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
.stats div:nth-child(4n) { border-right: 0; }
.stats div:nth-last-child(-n+4) { border-bottom: 0; }
.stats b { display: block; font: 400 64px/68px var(--mono); letter-spacing: -0.02em; }
.stats span { font: 500 18px/24px var(--label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
`;

// The one text on a slide that is not read from a file: a practitioner's message, quoted whole as
// he cleared it on 2026-11-20. Do not shorten or reword it.
const QUOTE = "I still have it running, but I had to shift to HEC-RAS at work. The issue is with Windows and a secured Windows-based DOS emulator. I don't use it like I used to, but I still calculate advisory flood heights (AFH). I too have worked on a browser app, but it's specifically for irregular channel calculations. If you can reverse-engineer the entire tool set, that would be amazing. I'll help just to see it done.";
// Kotsu sits at the corner of each slide (docs/mascot.md), when the art exists.
const KOTSU = existsSync(join(ROOT, 'art/kotsu-icon-512.png')) ? pathToFileURL(join(ROOT, 'art/kotsu-icon-512.png')).href : '';
const NOTICE = 'Quickened is an independent rebuild. It is not a FEMA product and is not accepted by FEMA. Use it as a cross-check.';
const block = (rows) => `<div class="block">${rows.map(([k, v]) => `<div class="k">${esc(k)}</div><div class="v">${v}</div>`).join('')}</div>`;

function slides(d) {
  const share = (n) => `${(100 * n / d.stored).toFixed(1)}%`;
  const list = [];

  list.push({
    name: 'what-it-is',
    alt: `Quickened's result for ${d.example.stream}: the cross section drawn with its water surface, and the fields QUICK-2 prints.`,
    h1: `A 1995 flood program, rebuilt from the <em>running program</em>, not its source`,
    main: `<div class="col" style="flex:0 0 480px;justify-content:center"><p class="lede" style="margin:0">QUICK-2 gives the flood elevation at one cross section. It no longer starts on a locked-down Windows laptop.</p>
      <p class="lede">Quickened is its method in a browser, checked field by field against the original.</p></div>
      <div class="col"><div class="tag"><b>Quickened</b> · ${esc(d.example.stream)}, ${esc(d.example.county)}</div><div class="shot contain"><img src="${capUrl('drawing-main')}"></div></div>`,
    block: [['Section', `${d.example.stations} stations, ${esc(d.example.dem)}`], ['Discharge', `${thousands(d.example.discharge)} cfs, ${esc(d.example.statistic)}, USGS regional regression`], ['Picture', 'the running app, taken by this build']],
  });

  list.push({
    name: 'the-person',
    alt: 'A quoted message from Joe Trimboli about still using QUICK-2.',
    h1: `The person who still needs it`,
    main: `<div class="col" style="justify-content:center"><blockquote>${esc(QUOTE)}</blockquote>
      <div class="who"><b>Joe Trimboli, MSc GIS-SME</b> · Huntington, West Virginia · author of two QUICK-2 guides (2013, 2023)</div></div>`,
    block: [['Source', 'his message of 2026-11-20, quoted whole and with his permission'], ['Context', "FEMA's list of nationally accepted hydraulic models names QUICK-2 1.0, for Zone A areas (devpost/sources.md)"]],
  });

  list.push({
    name: 'same-answer',
    alt: `QUICK-2's own recorded screen beside Quickened's result for the same inputs. Both print WS ELEV ${d.wsElev}.`,
    h1: `Same inputs, same printed answer`,
    main: `<div class="col" style="flex:1.3"><div class="tag"><b>QUICK-2 v1.0</b> · its own screen, recorded ${esc(d.recorded)}</div><div class="shot old"><pre>${esc(d.screen).split(esc(d.wsElev)).join(`<b>${esc(d.wsElev)}</b>`)}</pre></div></div>
      <div class="col"><div class="tag"><b>Quickened</b> · computed in the browser</div><div class="shot contain"><img src="${capUrl('tables-main')}"></div></div>`,
    block: [['Left', `case ${MAIN_CASE}: the 1995 program run headless in an emulator; its screen text is stored, never typed`], ['Right', 'the running app, taken by this build']],
  });

  list.push({
    name: 'headline',
    alt: `${d.matched} of ${d.stored} cases match.`,
    h1: `On ${thousands(d.drawn)} inputs it had never seen, every printed field is the same <em>${d.matched} times in ${d.stored}</em>`,
    main: `<div class="col" style="justify-content:center"><div class="figure">${d.matched}<small>of ${d.stored}</small></div>
      <div class="figure-label">cases where Quickened prints exactly what QUICK-2 printed · ${share(d.matched)}</div></div>`,
    block: [['Plan', 'committed before the batch was recorded; the solver was frozen at ' + esc(d.solverCommit)], ['Batch', `${thousands(d.drawn)} drawn at random, ${d.stored} answered by QUICK-2, ${d.notFinished} not finished in time`],
      ['Rule', 'the same outcome and the same text in every field'], ['File', `results/headline.md, run ${esc(d.runDate)}`]],
  });

  const pct = (n) => `${Math.max(100 * n / d.stored, 0.6).toFixed(2)}%`;
  const bar = (name, sub, n, weak) => `<div class="name">${name}<small>${sub}</small></div><div class="track"><div class="fill${weak ? ' weak' : ''}" style="width:${pct(n)}"></div>
    <div class="n" style="${100 * n / d.stored > 80 ? `right:calc(${(100 - 100 * n / d.stored).toFixed(2)}% + 16px);color:var(--paper)` : `left:calc(${pct(n)} + 16px)`}">${n}</div></div>`;
  list.push({
    name: 'without-the-oracle',
    alt: `With the original program as the grader ${d.matched} of ${d.stored} match; the same model without it matches ${d.run2}.`,
    h1: `The same model without the old program to answer to: <em>${d.run2} of ${d.stored}</em>`,
    lede: `One prompt, public knowledge of the method, no recorded answers. Its numbers are close (median difference ${esc(d.median)}), and a permit file needs the same number, not a close one.`,
    main: `<div class="col" style="justify-content:center"><div class="bars">
      ${bar('Quickened', 'built against QUICK-2, case by case', d.matched, false)}
      ${bar('One-prompt rebuild', 'same model, no oracle, no spec', d.run2, true)}
      ${bar('First attempt', 'kept for the record: its prompt leaked one answer', d.run1, true)}</div></div>`,
    block: [['Cases', `the same ${d.stored}, graded by the same rule`], ['Cost', `the one-prompt rebuild took ${esc(d.run2Credits)} Kiro credits`], ['File', 'results/ablation-manual-only.md; both programs are in ablation/']],
  });

  list.push({
    name: 'the-misses',
    alt: `The ${d.misses} cases that do not match, in ${d.classes.length} named classes.`,
    h1: `The ${d.misses} it gets wrong, <em>named and published</em>`,
    main: `<div class="col"><table class="t"><thead><tr><th>Cases</th><th>What differs</th><th>One of them: QUICK-2, then Quickened</th></tr></thead><tbody>
      ${d.classes.map((c) => `<tr><td class="num">${c.inBatch}</td><td>${esc(c.what)}</td><td class="mono">${esc(c.example.quick2)} &rarr; ${esc(c.example.quickened)}</td></tr>`).join('')}</tbody></table></div>`,
    block: [['Cause', 'not found yet for any class; none is explained beyond what the recorded answers show'], ['In the app', 'each class has an entry on the limits page'],
      ['Guard', "a test fails when the comparator's misses are not exactly this list"], ['Files', 'results/known-misses.json, results/headline.md']],
  });

  list.push({
    name: 'the-refusal',
    alt: 'In a new folder with the power installed, Kiro reports that the guard hook refused its edit to a recorded answer.',
    h1: `The agent cannot edit the answers`,
    main: `<div class="col" style="flex:0 0 590px"><div class="tag"><b>Kiro</b> · a new folder with only the power installed</div><div class="shot dark contain"><img src="${frameUrl('refusal-clean.png')}"></div></div>
      <div class="col" style="justify-content:center"><p class="lede" style="margin:0 0 26px">Recorded answers come from the 1995 program only. Asked to change one, Kiro was refused by a hook before the edit ran, and reported it.</p>
      <table class="t"><tbody>
      <tr><td class="num">${thousands(d.kiro.goldens)}</td><td>recorded cases, each with the screen it came from</td></tr>
      <tr><td class="num">all</td><td>match the recorder's manifest, checked when this slide was built</td></tr>
      <tr><td class="num">${d.kiro.hooks}</td><td>hooks: the guard, the comparator after each task and on save, the ledger on stop</td></tr></tbody></table></div>`,
    block: [['Picture', 'a capture of the Kiro window on 2026-11-26, cropped, not edited'],
      ['Limit', "the hook covers the agent's edit tools, as Kiro says in the same report; the manifest check covers the rest"]],
  });

  if (d.heldOut && d.heldOut.length) {
    list.push({
      name: 'predicted-first',
      alt: 'Each prediction round with the commit that fixed its predictions and how many were right.',
      h1: `Predictions were committed before their cases ran, <em>misses included</em>`,
      small: true,
      main: `<div class="col"><table class="t compact"><thead><tr><th>Round</th><th>Committed</th><th>Right</th><th>What was predicted</th></tr></thead><tbody>
        ${d.heldOut.map((r) => `<tr><td class="mono">${esc(r.round)}</td><td class="mono">${esc(r.commit).replace(', ', '<br>')}</td><td class="num">${esc(r.right)}</td><td>${esc(r.what)}</td></tr>`).join('')}</tbody></table>
        <p class="under">${esc(d.heldOut.note)}</p></div>`,
      block: [['File', 'results/held-out.md, every row of it, checked against results/attempts.md by a test']],
    });
  }

  list.push({
    name: 'limits-in-the-product',
    alt: "Quickened's result for a test discharge, with the flag that QUICK-2 counts cut-off low ground as flowing.",
    h1: `Where QUICK-2 itself is off, <em>the page says so</em>`,
    lede: `QUICK-2 counts low ground that is cut off from the channel as carrying flow. Quickened prints QUICK-2's answer, because that is the accepted method, and flags the difference beside it.`,
    main: `<div class="col" style="flex:1.1"><div class="tag"><b>Quickened</b> · the same section at a test discharge</div><div class="shot contain" style="flex:1.5"><img src="${capUrl('drawing-cutoff')}"></div>
      <div class="shot contain" style="flex:1;margin-top:12px"><img src="${capUrl('flags-cutoff')}"></div></div>
      <div class="col"><div class="tag"><b>Limits page</b> · entry H-001</div><div class="shot contain"><img src="${capUrl('limits-h001')}"></div></div>`,
    block: [['Pictures', 'the running app, taken by this build'], ['File', 'results/hauntings.md feeds the limits page at build time']],
  });

  list.push({
    name: 'for-the-file',
    alt: 'The printed sheet and the phone view of the same job.',
    h1: `One sheet for the permit file, and it works on a phone`,
    main: `<div class="col" style="flex:1.25"><div class="tag"><b>Print view</b> · US Letter</div><div class="shot contain" style="background:#fff"><img src="${capUrl('print-main')}"></div></div>
      <div class="col" style="flex:0 0 330px"><div class="tag"><b>375 px</b></div><div class="shot contain"><img src="${capUrl('phone-main')}"></div></div>
      <div class="col" style="justify-content:center;flex:0.9"><table class="t"><tbody>
      <tr><td>The inputs are labelled as the engineer's; every output is labelled as computed by QUICK-2's method.</td></tr>
      <tr><td>No account, no server: the solver runs in the page and works offline.</td></tr>
      <tr><td>${esc(NOTICE)}</td></tr></tbody></table></div>`,
    block: [['Pictures', 'the running app, taken by this build']],
  });

  list.push({
    name: 'built-in-kiro',
    alt: 'Counts of the Kiro specs, criteria, hooks, steering files, agents and MCP tools in the repository.',
    h1: `Built in Kiro, with the old program as the test oracle`,
    lede: `An MCP server runs QUICK-2 headless and answers one case at a time. The Exhumer agent writes requirements from what it prints. The Skeptic tries to disprove them. Specs carry every rule to code.`,
    main: `<div class="col" style="justify-content:center"><div class="stats">
      <div><b>${d.kiro.specs}</b><span>specs</span></div><div><b>${d.kiro.criteria}</b><span>acceptance criteria</span></div>
      <div><b>${d.kiro.tools}</b><span>MCP tools on the oracle</span></div><div><b>${d.kiro.hooks}</b><span>agent hooks</span></div>
      <div><b>${d.kiro.agents}</b><span>custom agents</span></div><div><b>${d.kiro.steering}</b><span>steering files</span></div>
      <div><b>${thousands(d.kiro.goldens)}</b><span>recorded cases</span></div><div><b>${d.kiro.commits}</b><span>commits</span></div></div></div>`,
    block: [['Counted', 'from .kiro/, oracle/ and the git history when this slide was built'], ['Log', 'docs/build-log.md: every prompt, each session, and where Kiro changed the plan']],
  });

  return list;
}

function page(slide, i, n) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(slide.name)}</title><style>${CSS}</style></head><body>
<div class="sheet">
  <div class="top"><b>Quickened</b><span>Sheet ${String(i + 1).padStart(2, '0')} of ${String(n).padStart(2, '0')}</span></div>
  <h1${slide.small ? ' class="small"' : ''}>${slide.h1}</h1>
  ${slide.lede ? `<p class="lede">${slide.lede}</p>` : ''}
  <div class="main">${slide.main}</div>
  ${block(slide.block)}
  <div class="foot"><span>${esc(NOTICE)}</span><span class="mark">Oracle Bones${KOTSU ? `<img src="${KOTSU}" alt="">` : ''}</span></div>
</div>
<script>
  // The recorded screen is set in type, then scaled to fit its frame.
  document.fonts.ready.then(() => {
    for (const pre of document.querySelectorAll('.shot.old pre')) {
      const box = pre.parentElement.getBoundingClientRect();
      pre.style.transform = 'scale(' + Math.min((box.width - 44) / pre.scrollWidth, (box.height - 36) / pre.scrollHeight) + ')';
    }
  });
</script></body></html>`;
}

// ---------------------------------------------------------------------------------------------

const data = loadData();
const browser = await openBrowser();
try {
  if (!SKIP_CAPTURES) await takeCaptures(browser);
  const every = slides(data);
  const all = PICK.length ? PICK.map((n) => {
    const s = every.find((x) => x.name === n);
    if (!s) throw new Error(`gallery: no slide named ${n}; the slides are ${every.map((x) => x.name).join(', ')}`);
    return s;
  }) : every;
  const index = [];
  // A full build starts from an empty folder, so a renumbered slide leaves no stale picture behind.
  if (!ONLY.length) for (const f of readdirSync(OUT_DIR)) if (/^\d\d-.*\.png$/.test(f)) rmSync(join(OUT_DIR, f));
  await browser.send('Emulation.setEmulatedMedia', { media: 'screen' });
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 2, mobile: false });
  for (const [i, slide] of all.entries()) {
    const num = String(i + 1).padStart(2, '0');
    index.push({ file: `${num}-${slide.name}.png`, alt: slide.alt });
    if (ONLY.length && !ONLY.includes(num)) continue;
    const file = join(HTML, `${num}-${slide.name}.html`);
    writeFileSync(file, page(slide, i, all.length));
    await browser.send('Page.navigate', { url: pathToFileURL(file).href });
    await sleep(700);
    await browser.js('document.fonts.ready.then(() => "ok")');
    await sleep(250);
    const fit = await browser.js(`(() => { const pre = document.querySelector('.shot.old pre'); if (!pre) return ''; const b = pre.parentElement.getBoundingClientRect(); return ' fit ' + pre.style.transform + ' pre ' + pre.scrollWidth + 'x' + pre.scrollHeight + ' box ' + Math.round(b.width) + 'x' + Math.round(b.height); })()`);
    const overflow = await browser.js(`(() => { const s = document.querySelector('.sheet'); const m = document.querySelector('.main'); const b = document.querySelector('.block').getBoundingClientRect().top; return s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1 || [...m.querySelectorAll('.col > *')].some((e) => e.getBoundingClientRect().bottom > b + 1); })()`);
    const shot = await browser.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1500, height: 1000, scale: 1 } });
    writeFileSync(join(OUT_DIR, `${num}-${slide.name}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log(`slide ${num} ${slide.name}${overflow ? '  OVERFLOWS its sheet' : ''}${fit}`);
  }
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify({ built: new Date().toISOString(), url: BASE, slides: index, data }, null, 1));
} finally {
  await browser.close();
}
