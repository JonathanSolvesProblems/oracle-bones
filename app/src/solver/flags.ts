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
