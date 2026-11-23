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
import type { RegularMode, RegularShape } from '../solver/types.ts';

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
  cd_circ_result: {
    in_diameter: { row: 9, col: 30, width: 7 },
    in_n: { row: 9, col: 51, width: 13 },
    in_discharge: { row: 10, col: 28, width: 9 },
    depth: { row: 10, col: 50, width: 14 },
    in_slope: { row: 11, col: 26, width: 11 },
    critical_slope: { row: 11, col: 54, width: 10 },
    area: { row: 15, col: 25, width: 12 },
    wet_perimeter: { row: 15, col: 58, width: 6 },
    velocity: { row: 16, col: 28, width: 9 },
    hyd_radius: { row: 16, col: 55, width: 9 },
    top_width: { row: 17, col: 27, width: 10 },
    froude: { row: 17, col: 48, width: 16 },
    max_discharge: { row: 18, col: 31, width: 6 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  cd_result: {
    in_left_slope: { row: 8, col: 31, width: 4 },
    in_right_slope: { row: 8, col: 58, width: 4 },
    in_bottom_width: { row: 9, col: 30, width: 7 },
    in_n: { row: 9, col: 51, width: 13 },
    in_discharge: { row: 10, col: 28, width: 9 },
    depth: { row: 10, col: 50, width: 14 },
    in_slope: { row: 11, col: 26, width: 11 },
    critical_slope: { row: 11, col: 54, width: 10 },
    area: { row: 15, col: 25, width: 12 },
    wet_perimeter: { row: 15, col: 58, width: 6 },
    velocity: { row: 16, col: 28, width: 9 },
    hyd_radius: { row: 16, col: 55, width: 9 },
    top_width: { row: 17, col: 27, width: 10 },
    froude: { row: 17, col: 48, width: 16 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  cc_circ_result: {
    in_diameter: { row: 9, col: 30, width: 7 },
    in_n: { row: 9, col: 51, width: 13 },
    discharge: { row: 10, col: 28, width: 9 },
    in_depth: { row: 10, col: 50, width: 14 },
    in_slope: { row: 11, col: 26, width: 11 },
    area: { row: 15, col: 25, width: 12 },
    wet_perimeter: { row: 15, col: 58, width: 6 },
    velocity: { row: 16, col: 28, width: 9 },
    hyd_radius: { row: 16, col: 55, width: 9 },
    top_width: { row: 17, col: 27, width: 10 },
    froude: { row: 17, col: 48, width: 16 },
    max_discharge: { row: 18, col: 31, width: 6 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  cc_result: {
    in_left_slope: { row: 8, col: 31, width: 4 },
    in_right_slope: { row: 8, col: 58, width: 4 },
    in_bottom_width: { row: 9, col: 30, width: 7 },
    in_n: { row: 9, col: 51, width: 13 },
    discharge: { row: 10, col: 28, width: 9 },
    in_depth: { row: 10, col: 50, width: 14 },
    in_slope: { row: 11, col: 26, width: 11 },
    area: { row: 15, col: 25, width: 12 },
    wet_perimeter: { row: 15, col: 58, width: 6 },
    velocity: { row: 16, col: 28, width: 9 },
    hyd_radius: { row: 16, col: 55, width: 9 },
    top_width: { row: 17, col: 27, width: 10 },
    froude: { row: 17, col: 48, width: 16 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  nd_circ_result: {
    in_diameter: { row: 9, col: 30, width: 7 },
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
    max_discharge: { row: 18, col: 31, width: 6 },
    flow_type: { row: 18, col: 49, width: 16 },
  },
  nd_reg_result: {
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

// The regular-shape result screens (Normal Depth, Critical Depth and Channel Capacity on the
// trapezoid, V-ditch, rectangle and circle). All of them share one box (criterion 4 intro): the
// mode on row 3, the shape on row 4, inputs on rows 8 to 11, outputs on rows 15 to 18. They
// differ only in these rows:
// - the circle has no side-slope row, and Diameter (in) where the others have Bottom Width
//   (criterion 4.4), and Max Discharge on row 18 (criterion 4.5);
// - Critical Depth adds Critical Slope on row 11 (criterion 5.1);
// - Channel Capacity on the circle prints its discharge with one decimal (criterion 6.2).
// The rows were taken from the final screens of the first recorded case of each mode and
// shape, with every window blanked and its picture written in; layout.test.ts checks each
// layout against those screens.
const ROW = {
  BLANK: '                                                                                ',
  TOP: '           ╔═════════════════════════════════════════════════════╗              ',
  MODE_ND: '           ║                    NORMAL  DEPTH                    ║██            ',
  MODE_CD: '           ║                   CRITICAL  DEPTH                   ║██            ',
  MODE_CC: '           ║                  CHANNEL  CAPACITY                  ║██            ',
  SHAPE_TRAP: '           ║                 TRAPEZOIDAL CHANNEL                 ║██            ',
  SHAPE_VDIT: '           ║                      V - DITCH                      ║██            ',
  SHAPE_RECT: '           ║                 RECTANGULAR CHANNEL                 ║██            ',
  SHAPE_CIRC: '           ║                  CIRCULAR  CHANNEL                  ║██            ',
  EMPTY: '           ║                                                     ║██            ',
  INPUT: '           ║                   INPUT VARIABLES                   ║██            ',
  SLOPES: '           ║ L Side Slope (H:V)##.#:1   R Side Slope (H:V)##.#:1 ║██            ',
  WIDTH: "           ║ Bottom Width (ft) ####.#   Manning's n       #.#### ║██            ",
  DIAMETER: "           ║ Diameter (in)     ####.#   Manning's n       #.#### ║██            ",
  FLOW: '           ║ Discharge (cfs)   ######   Depth (ft)        ###.## ║██            ',
  FLOW_CIRC_CC: '           ║ Discharge (cfs)   ####.#   Depth (ft)        ###.## ║██            ',
  SLOPE: '           ║ Slope (ft/ft)     #.####                            ║██            ',
  SLOPE_CRITICAL: '           ║ Slope (ft/ft)     #.####   Critical Slope    #.#### ║██            ',
  RULE: '           ╟─────────────────────────────────────────────────────╢██            ',
  OUTPUT: '           ║                  OUTPUT VARIABLES                   ║██            ',
  AREA: '           ║ Area (sq ft)      ####.#   Wet Perimeter (ft)####.# ║██            ',
  VELOCITY: '           ║ Velocity (ft/s)   ####.#   Hyd Radius (ft)   ####.# ║██            ',
  TOP_WIDTH: '           ║ Top Width (ft)    ####.#   Froude #          ####.# ║██            ',
  FLOW_TYPE: '           ║                            Flow Type  @@@@@@@@@@@@@ ║██            ',
  MAX_DISCHARGE: '           ║ Max Discharge(cfs)######   Flow Type  @@@@@@@@@@@@@ ║██            ',
  BEGIN: '           ║ Begin Calculations  <Enter>                         ║██            ',
  PRINT: '           ║ Print               <F5>           New Shape  <F9>  ║██            ',
  BACK: '           ║ <- Back Tab         <F2>           Main Menu  <F7>  ║██            ',
  BOTTOM: '           ╚═════════════════════════════════════════════════════╝██            ',
  SHADOW: '            ████████████████████████████████████████████████████████            ',
} as const;

export const REGULAR_MODES: readonly RegularMode[] = ['normal_depth', 'critical_depth', 'channel_capacity'];
export const REGULAR_SHAPES: readonly RegularShape[] = ['trapezoid', 'v_ditch', 'rectangle', 'circle'];

const MODE_ROW: Readonly<Record<RegularMode, string>> = {
  normal_depth: ROW.MODE_ND, critical_depth: ROW.MODE_CD, channel_capacity: ROW.MODE_CC,
};
const SHAPE_ROW: Readonly<Record<RegularShape, string>> = {
  trapezoid: ROW.SHAPE_TRAP, v_ditch: ROW.SHAPE_VDIT, rectangle: ROW.SHAPE_RECT, circle: ROW.SHAPE_CIRC,
};

/** The profile's result screen for each regular mode and shape. */
export const REGULAR_SCREEN: Readonly<Record<RegularMode, Readonly<Record<RegularShape, string>>>> = {
  normal_depth: { trapezoid: 'nd_trap_result', v_ditch: 'nd_reg_result', rectangle: 'nd_reg_result', circle: 'nd_circ_result' },
  critical_depth: { trapezoid: 'cd_result', v_ditch: 'cd_result', rectangle: 'cd_result', circle: 'cd_circ_result' },
  channel_capacity: { trapezoid: 'cc_result', v_ditch: 'cc_result', rectangle: 'cc_result', circle: 'cc_circ_result' },
};

function regularRows(mode: RegularMode, shape: RegularShape): string[] {
  const circle = shape === 'circle';
  return [
    ROW.BLANK, ROW.BLANK, ROW.TOP, MODE_ROW[mode], SHAPE_ROW[shape], ROW.EMPTY, ROW.INPUT, ROW.EMPTY,
    circle ? ROW.EMPTY : ROW.SLOPES,
    circle ? ROW.DIAMETER : ROW.WIDTH,
    circle && mode === 'channel_capacity' ? ROW.FLOW_CIRC_CC : ROW.FLOW,
    mode === 'critical_depth' ? ROW.SLOPE_CRITICAL : ROW.SLOPE,
    ROW.RULE, ROW.OUTPUT, ROW.EMPTY, ROW.AREA, ROW.VELOCITY, ROW.TOP_WIDTH,
    circle ? ROW.MAX_DISCHARGE : ROW.FLOW_TYPE,
    ROW.RULE, ROW.BEGIN, ROW.PRINT, ROW.BACK, ROW.BOTTOM, ROW.SHADOW,
  ];
}

// Paint order: the inputs in prompt order (a fixed field where the screen reads it), then the
// outputs row by row. Only the fields the screen has are painted.
const REGULAR_PAINT_ORDER = [
  'in_left_slope', 'in_right_slope', 'in_bottom_width', 'in_diameter', 'in_n', 'in_discharge', 'in_depth', 'in_slope',
  'depth', 'discharge', 'critical_slope', 'area', 'wet_perimeter', 'velocity', 'hyd_radius', 'top_width', 'froude',
  'max_discharge', 'flow_type',
];

// Start columns no golden has shown: computed Depth (Depth entered has shown `%1000.00` on a
// form, criterion 8.1), Velocity, Hyd Radius, Froude, Max Discharge and Diameter.
const REGULAR_UNOBSERVED_START = ['in_diameter', 'depth', 'velocity', 'hyd_radius', 'froude', 'max_discharge'];

function regularLayout(mode: RegularMode, shape: RegularShape): ResultScreen {
  const windows = windowsOf(REGULAR_SCREEN[mode][shape]);
  return {
    rows: regularRows(mode, shape),
    paintOrder: REGULAR_PAINT_ORDER.filter((f) => f in windows),
    windows,
    unobservedStart: REGULAR_UNOBSERVED_START.filter((f) => f in windows),
  };
}

/** Every regular result layout, by mode and shape. */
export const REGULAR_RESULT: Readonly<Record<RegularMode, Readonly<Record<RegularShape, ResultScreen>>>> =
  Object.fromEntries(REGULAR_MODES.map((m) => [m, Object.fromEntries(REGULAR_SHAPES.map((s) => [s, regularLayout(m, s)]))])) as
    Record<RegularMode, Record<RegularShape, ResultScreen>>;

export const ND_TRAP_RESULT: ResultScreen = REGULAR_RESULT.normal_depth.trapezoid;

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
