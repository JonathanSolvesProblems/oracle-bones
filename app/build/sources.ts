// The worked examples' data sources, read from realdata/huntington-section-01.json where the file
// holds them (quickened-app criteria 8.7, 8.8; design: The worked examples). The Manning's n
// source is quick2-solver Requirement 9's introduction, which the file does not hold; it is
// written here. Numbers from the file are written as text here, at build time, so ui/ formats
// none of them.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SourceItem { name: string; text: string; }

export interface Sources {
  items: SourceItem[];
  caveats: string[];
  /** The main example's discharge sentence (8.8). */
  mainDischarge: string;
  /** The cut-off example's discharge sentence (8.9, amended 2026-11-26: no range of elevations). */
  cutoffDischarge: string;
}

/** The Manning's n source (quick2-solver Requirement 9, introduction). */
export const MANNING_SOURCE = "from Chow (1959), as reproduced in the HEC-RAS Hydraulic Reference Manual, Table 3-1, normal column: an assumption made without seeing the site";

const cfs = (x: number) => x.toLocaleString('en-US');

/** The file's value at a path, or the build fails naming the file and the path. */
function at(j: unknown, path: string): unknown {
  let v: unknown = j;
  for (const k of path.split('.')) {
    v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
  }
  if (v === undefined || v === null) throw new Error(`realdata/huntington-section-01.json has no ${path}`);
  return v;
}

export function readSources(root: string, n: { left: string; channel: string; right: string }, cutoffQ: string): Sources {
  const path = join(root, 'realdata', 'huntington-section-01.json');
  const j = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  const s = (p: string) => String(at(j, p));
  const countyState = s('stream.county_state').split(' (')[0]!;
  const firm = (at(j, 'fema_flood_zone.attributes_esri_copy') as { DFIRM_ID: string }[])[0]!.DFIRM_ID;
  const dem = s('cross_section.dem_source').split(' (')[0]!;
  const lower = cfs(Number(at(j, 'discharge.prediction_interval_90pct_cfs.lower')));
  const upper = cfs(Number(at(j, 'discharge.prediction_interval_90pct_cfs.upper')));
  return {
    items: [
      { name: 'Stream', text: `${s('stream.name')}, ${countyState}, a Zone ${s('fema_flood_zone.zone')} stream on FIRM panel ${firm}.` },
      { name: 'Flowline', text: `NHD flowline ${s('stream.nhd_permanent_identifier')}.` },
      { name: 'Ground points', text: `From the ${dem}, through the USGS Elevation Point Query Service.` },
      { name: 'Bank stations', text: `${s('bank_stations_suggested.left_bank_station_ft')} and ${s('bank_stations_suggested.right_bank_station_ft')}: ${s('bank_stations_suggested.label')}.` },
      { name: 'Slope', text: `${s('slope.recommended_estimate_ft_per_ft')}: ${s('slope.label')}, from the 3DEP thalweg profile.` },
      { name: "Manning's n", text: `${n.left}, ${n.channel} and ${n.right}, ${MANNING_SOURCE}.` },
    ],
    caveats: (at(j, 'caveats') as string[]).map(String),
    mainDischarge: `${cfs(Number(at(j, 'discharge.q100_cfs')))} cfs is the USGS StreamStats 1-percent AEP flood estimate for the site `
      + `(regression region ${s('discharge.regression_region.code')}, drainage area ${Number(at(j, 'discharge.drainage_area_mi2')).toFixed(2)} mi², `
      + `90% prediction interval ${lower} to ${upper} cfs), a regional regression estimate. Source: ${s('discharge.citation')}`,
    cutoffDischarge: `${cfs(Number(cutoffQ))} cfs is a test value, chosen to fill the cut-off low ground. It is not a flood estimate, `
      + `and it is above the 1-percent estimate's 90% prediction interval (${lower} to ${upper} cfs).`,
  };
}
