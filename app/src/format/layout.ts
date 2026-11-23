// Each result screen's fields: the screen's rows with a PRINT USING picture where each value
// goes, the paint order, and each field's window.
//
// WINDOWS is copied from oracle/targets/quick2.json, and a test fails if the two differ. It is
// the one table outside constants.ts allowed numeric literals; the guard test exempts it by
// name. The profile itself is not imported, because it also holds the control cases and their
// expected printed values, which must stay out of the solver's reach.
//
// A picture's first column is the format's start column. Where a golden shows an overflow, that
// column is observed; elsewhere it is set so the field's largest accepted value fits, and the
// field is listed in `unobservedStart`.

import type { ScreenLayout, Window } from './screen.ts';

export const WINDOWS: Readonly<Record<string, Readonly<Record<string, Window>>>> = {
  nd_trap_result: {
    in_left_slope: { row: 8, col: 31, width: 4 },
    in_right_slope: { row: 8, col: 58, width: 4 },
    in_bottom_width: { row: 9, col: 30, width: 7 },
    in_n: { row: 9, col: 51, width: 13 },
    in_discharge: { row: 10, col: 28, width: 9 },
    depth: { row: 10, col: 50, width: 14 },
    in_slope: { row: 11, col: 26, width: 11 },
    area: { row: 15, col: 25, width: 12 },
    wet_perimeter: { row: 15, col: 58, width: 6 },
    velocity: { row: 16, col: 28, width: 9 },
    hyd_radius: { row: 16, col: 55, width: 9 },
    top_width: { row: 17, col: 27, width: 10 },
    froude: { row: 17, col: 48, width: 16 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  nd_irr_result: {
    in_bank_left: { row: 16, col: 37, width: 9 },
    in_bank_right: { row: 16, col: 67, width: 9 },
    in_n_left: { row: 17, col: 37, width: 9 },
    in_n_channel: { row: 17, col: 53, width: 9 },
    in_n_right: { row: 17, col: 67, width: 9 },
    in_irr_discharge: { row: 18, col: 37, width: 9 },
    in_irr_slope: { row: 18, col: 51, width: 10 },
    depth: { row: 18, col: 67, width: 9 },
    ws_elev: { row: 20, col: 12, width: 20 },
    area: { row: 20, col: 37, width: 9 },
    top_width: { row: 20, col: 53, width: 9 },
    hyd_radius: { row: 20, col: 67, width: 9 },
    flow_type: { row: 21, col: 14, width: 15 },
    chan_velocity: { row: 21, col: 37, width: 9 },
    wet_perimeter: { row: 21, col: 53, width: 9 },
    froude: { row: 21, col: 67, width: 9 },
  },
};

export interface ResultScreen extends ScreenLayout {
  /** Fields whose format start column no golden has shown. */
  unobservedStart: readonly string[];
}

function windowsOf(id: string): Readonly<Record<string, Window>> {
  const w = WINDOWS[id];
  if (!w) throw new Error(`no windows for screen ${id}`);
  return w;
}

export const ND_TRAP_RESULT: ResultScreen = {
  rows: [
    '                                                                                ',
    '                                                                                ',
    '           ╔═════════════════════════════════════════════════════╗              ',
    '           ║                    NORMAL  DEPTH                    ║██            ',
    '           ║                 TRAPEZOIDAL CHANNEL                 ║██            ',
    '           ║                                                     ║██            ',
    '           ║                   INPUT VARIABLES                   ║██            ',
    '           ║                                                     ║██            ',
    '           ║ L Side Slope (H:V)##.#:1   R Side Slope (H:V)##.#:1 ║██            ',
    "           ║ Bottom Width (ft) ####.#   Manning's n       #.#### ║██            ",
    '           ║ Discharge (cfs)   ######   Depth (ft)        ###.## ║██            ',
    '           ║ Slope (ft/ft)     #.####                            ║██            ',
    '           ╟─────────────────────────────────────────────────────╢██            ',
    '           ║                  OUTPUT VARIABLES                   ║██            ',
    '           ║                                                     ║██            ',
    '           ║ Area (sq ft)      ####.#   Wet Perimeter (ft)####.# ║██            ',
    '           ║ Velocity (ft/s)   ####.#   Hyd Radius (ft)   ####.# ║██            ',
    '           ║ Top Width (ft)    ####.#   Froude #          ####.# ║██            ',
    '           ║                            Flow Type  @@@@@@@@@@@@@ ║██            ',
    '           ╟─────────────────────────────────────────────────────╢██            ',
    '           ║ Begin Calculations  <Enter>                         ║██            ',
    '           ║ Print               <F5>           New Shape  <F9>  ║██            ',
    '           ║ <- Back Tab         <F2>           Main Menu  <F7>  ║██            ',
    '           ╚═════════════════════════════════════════════════════╝██            ',
    '            ████████████████████████████████████████████████████████            ',
  ],
  paintOrder: [
    'in_left_slope', 'in_right_slope', 'in_bottom_width', 'in_n', 'in_discharge', 'in_slope',
    'depth', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude', 'flow_type',
  ],
  windows: windowsOf('nd_trap_result'),
  unobservedStart: ['depth', 'velocity', 'hyd_radius', 'froude'],
};

// Normal Depth, irregular section. Rows 4 to 13 hold the GROUND POINTS grid, which shows the
// points as typed (criterion 9.1, drawn by the app), and row 24 holds EXTENDED CROSS SECTION
// when it applies (a flag); the layout leaves both blank. No overflow has been seen on this
// screen, so every numeric start column is set to fit and is unobserved. Decimals: WS ELEV 2,
// Depth 1, Area, Top Wid and Wet Per none, Hyd R 1, Chan Vel 1, Froude 2, banks 1, n values and
// slope 4, discharge none (criterion 3.6).
export const ND_IRR_RESULT: ResultScreen = {
  rows: [
    '                                                                                ',
    '                                                                                ',
    '  XSEC ID:     0             >> NORMAL   DEPTH <<             GROUND  POINTS    ',
    '  STAT      ELEV      STAT      ELEV      STAT      ELEV      STAT      ELEV    ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '                                                                                ',
    '   ╔════════════════════════════════════════════════════════════════════════╗   ',
    '   ║ CHANNEL BANK STATIONS:      Left ####.#                  Right ####.#  ║   ',
    "   ║ MANNING'S  N   VALUES:      Left #.####  Channel #.####  Right #.####  ║   ",
    '   ║ CHANNEL     VARIABLES: Discharge ######  Slope   #.####  Depth ####.#  ║   ',
    '   ╟────────────────────────────────────────────────────────────────────────╢   ',
    '   ║ WS ELEV   ####.##           Area ######  Top Wid ######  Hyd R ####.#  ║   ',
    '   ║ Flow Type @@@@@@@@@@@@@ Chan Vel ####.#  Wet Per ######  Frd # ###.##  ║   ',
    '   ╟────────────────────────────────────────────────────────────────────────╢   ',
    '   ║ F2}<─ Back Tab F5}PRINT F6}SAVE F7}Main Menu F8}New XSEC F10}Ed/Ex GrPt║   ',
    '   ║                                                                        ║   ',
  ],
  paintOrder: [
    'in_bank_left', 'in_bank_right', 'in_n_left', 'in_n_channel', 'in_n_right', 'in_irr_discharge', 'in_irr_slope',
    'depth', 'ws_elev', 'area', 'top_width', 'hyd_radius', 'flow_type', 'chan_velocity', 'wet_perimeter', 'froude',
  ],
  windows: windowsOf('nd_irr_result'),
  unobservedStart: [
    'in_bank_left', 'in_bank_right', 'in_n_left', 'in_n_channel', 'in_n_right', 'in_irr_discharge', 'in_irr_slope',
    'depth', 'ws_elev', 'area', 'top_width', 'hyd_radius', 'chan_velocity', 'wet_perimeter', 'froude',
  ],
};
