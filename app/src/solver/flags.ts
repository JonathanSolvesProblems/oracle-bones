// Odd-behaviour flags and their plain-words text (design: Odd behaviours and their flags).
// The app decides how to show them; the solver never changes a printed value because of a flag.

import type { Flag, FlagCode } from './types.ts';

export const FLAG_TEXT: Readonly<Record<FlagCode, string>> = {
  extended_section:
    'The water surface is above an end of the cross section. QUICK-2 treats each end as a vertical wall and prints EXTENDED CROSS SECTION.',
  cut_off_area_counted:
    'Low ground cut off from the channel by higher ground is counted as carrying water, as QUICK-2 does. You may judge it ineffective flow area.',
  negative_input:
    'QUICK-2 accepted a negative value for this field and computed with it. A negative value has no physical meaning here.',
  never_finishes:
    'QUICK-2 never finishes this calculation; it keeps searching. Quickened stops and shows no answer.',
  returns_to_menu:
    'QUICK-2 abandons this calculation and goes back to the shape menu without a message.',
};

export function flag(code: FlagCode, fields: string[] = []): Flag {
  return { code, text: FLAG_TEXT[code], fields };
}

/**
 * EXTENDED CROSS SECTION: the water surface is above the first or the last ground elevation
 * (criteria 3.12, 3.13, 10.2).
 */
export function isExtended(points: readonly { elevation: number }[], ws: number): boolean {
  const first = points[0];
  const last = points[points.length - 1];
  return !!first && !!last && (ws > first.elevation || ws > last.elevation);
}

/** Low ground cut off from the channel counts as wet: the wet section is more than one span (9.7). */
export function isCutOff(spans: readonly [number, number][]): boolean {
  return spans.length > 1;
}

/** The flags an irregular result carries at water-surface elevation ws. */
export function irregularFlags(points: readonly { elevation: number }[], ws: number, spans: readonly [number, number][]): Flag[] {
  const out: Flag[] = [];
  if (isExtended(points, ws)) out.push(flag('extended_section', ['ws_elev', 'top_width', 'wet_perimeter']));
  if (isCutOff(spans)) out.push(flag('cut_off_area_counted', ['area', 'top_width', 'wet_perimeter']));
  return out;
}
