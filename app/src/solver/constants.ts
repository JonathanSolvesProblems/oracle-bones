// Every numeric program constant. This is the only file in app/src/solver/ or app/src/format/
// that may hold a numeric literal other than 0, 1, 2 and -1 (design: When the rebuild and the
// oracle disagree, rule 3). Each constant carries a `@cite` tag naming the cases that pin it, or,
// for a choice the rebuild makes on its own, saying so. The guard test checks every export here
// has one. Case ids appear only in these comments, never in code.
//
// The constants table is a finding to keep re-testing, not a fit to protect.

/**
 * Manning's constant in US customary units.
 * @cite nd-trap-000001 nd-trap-000002 cc-trap-000001 (Channel Capacity fields: 0 mismatches
 * with 1.486, 62 with 1.49)
 */
export const MANNING_K = 1.486;

/**
 * The 2/3 power as `.667`: the regular-shape search discharge, Channel Capacity discharge and
 * velocity on the prismatic shapes, and Critical Slope.
 * @cite nd-trap-000001 nd-trap-000002 (Normal Depth 47 of 53 with .667, 16 with .6667)
 * cc-vdit-000012 (velocity 5104.8) cc-vdit-000002 cc-rect-000005 cc-trap-000003 (discharges
 * printed to ten digits: 3578117632, 4207745280, 1062046336; 39 of 39 prismatic Channel
 * Capacity discharges match with .667, 3 with .6667)
 */
export const EXP_A = 0.667;

/**
 * The 2/3 power as `.6667`: Max Discharge, Channel Capacity discharge on the circle, the
 * circle's Normal Depth search (not settled), and irregular conveyance.
 * @cite cc-circ-000002 cc-circ-000019 cc-circ-000020 (Channel Capacity circles: 10 of 10 with
 * .6667, 1 of 10 with .667) nd-irr-000001 nd-irr-000002 nd-irr-000010 (irregular Normal
 * Depth 24 of 24 with .6667, 10 with .667)
 */
export const EXP_B = 0.6667;

/**
 * The search stops when a trial discharge is within this fraction of the target.
 * @cite nd-trap-000001 (3.27 against an exact 3.286) nd-rect-000019 (206.00 against 207.70);
 * 0.0099 and 0.0101 give the same matches, so the exact value is not pinned
 */
export const SEARCH_TOL = 0.01;

/**
 * Depth step, and first trial depth, of the search on the prismatic shapes (ft).
 * @cite nd-rect-000019 (stops on 206.00) nd-trap-000001 nd-trap-000002
 */
export const PRISMATIC_STEP = 0.5;

/**
 * The irregular search's first trial is this far above the lowest ground point (ft).
 * @cite nd-irr-000015 nd-irr-000021 nd-irr-000023 (stop on depths 58.6, 40.6, 47.1)
 */
export const IRREGULAR_START = 0.1;

/**
 * Depth step of the irregular search after its first trial (ft).
 * @cite nd-irr-000015 nd-irr-000021 nd-irr-000023 nd-irr-000001
 */
export const IRREGULAR_STEP = 0.5;

/**
 * Acceleration of gravity (ft/s²).
 * @cite nd-trap-000001 (Froude 0.6) cd-trap-000001 (32.174 drops Critical Depth from 54 to 22
 * of 68 matched)
 */
export const G = 32.2;

/**
 * The search gives up when the trial depth passes this (ft). QUICK-2 never gives up; this
 * limit is the rebuild's own choice and is not observed.
 * @cite none: rebuild's choice (design: The depth search). Behaviour it stands in for:
 * obs-negnstall-000001 nd-irr-000026
 */
export const SEARCH_DEPTH_LIMIT = 100000;

/**
 * The most trials the search makes before it gives up. Not observed; the rebuild's own guard
 * against a search that cannot finish.
 * @cite none: rebuild's choice (design: The depth search)
 */
export const SEARCH_MAX_TRIALS = 1000000;

/**
 * The circle's Diameter is typed in inches, its depths in feet.
 * @cite cc-circ-000001 (label "Diameter (in)", criterion 4.4) cc-circ-000018 (Depth 4 held in
 * a 36 in pipe, criterion 8.5)
 */
export const INCHES_PER_FOOT = 12;
/**
 * π as QUICK-2 types it, in the circle's wetted angle.
 * @cite cc-circ-000020 cc-circ-000023 (with 3.14159265 their discharges miss; with 3.1416 none
 * of the Channel Capacity circles do)
 */
export const PI_QUICK2 = 3.1416;
/**
 * Max Discharge is the Manning flow at this fraction of the diameter, the peak of the part-full
 * curve. .938 sits below the peak; .9382 is at it.
 * @cite cc-circ-000027 (271099; .938 gives 271098.47), cc-circ-000034, cc-circ-000036; known
 * difference cc-circ-000035 (Q-028); A-004 M2, A-006
 */
export const MAX_DISCHARGE_DEPTH = 0.9382;
/**
 * First trial and step of the circle's Normal Depth search (ft).
 * @cite nd-circ-000007, nd-circ-000015 to -000017 (49.00, 49.10), nd-circ-000009 (8.40),
 * nd-circ-000012 (6.10); Q-025
 */
export const CIRCLE_STEP = 0.1;
/**
 * The circle's search, in both Normal Depth and Critical Depth, stops when a trial is within
 * this fraction of the target. The prismatic and irregular searches keep SEARCH_TOL.
 * @cite nd-circ-000015, nd-circ-000016 against cc-circ-000028 (between 0.464% and 0.515%),
 * nd-circ-000009 (0.466%); Critical Depth fits 0.37% to 0.94% (cd-circ-000015, cd-circ-000020);
 * Q-025, A-004
 */
export const CIRCLE_TOL = 0.005;
/**
 * First trial and step of the circle's Critical Depth search (ft).
 * @cite cd-circ-000011 (stops on the trial at 6.60); fitted on cd-circ-000001 to -000021
 * (A-004 H5); held-out cd-circ-000022 to -000032, with cd-circ-000030 to -000032 printing the
 * 0.2 ft prediction and not the 0.1 ft one (A-006)
 */
export const CIRCLE_CD_STEP = 0.2;
/**
 * Circle Critical Depth prints Depth this far (ft) below the search depth at which its other
 * fields are computed.
 * @cite cd-circ-000019 to -000021 against cc-circ-000031 to -000033 (Q-024); every CD circle
 * fits 0.0089 to 0.0101 ft (A-004 measurement 2); cd-circ-000010 (rounding boundary)
 */
export const CIRCLE_CD_DEPTH_OFFSET = 0.01;
/**
 * Ground-point entry ends by itself after this many points.
 * @cite nd-irr-000001 obs-bankreject-000001 (criterion 3.2)
 */
export const GROUND_POINTS_MAX = 40;

// ---- print rules -------------------------------------------------------------------------

/**
 * Significant digits QuickBASIC's plain PRINT shows for a single-precision number.
 * @cite QuickBASIC 4.5 manual (PRINT); observed only on whole numbers, obs-irrelev-000001
 * obs-irrstation-000001 (`35`, `-50`, `-60` in the station error)
 */
export const SINGLE_PRINT_DIGITS = 7;

/**
 * The number base of printed digits.
 * @cite every printed field; nd-trap-000001
 */
export const DECIMAL_BASE = 10;

/**
 * An overflowing value prints as `%` and its text in full while that text (sign, digits, point
 * and decimals) is at most this many characters long; past that QuickBASIC prints an exponent.
 * @cite cc-rect-000002 (793879552, 9 characters, in full) cc-vdit-000002 cc-rect-000005
 * cc-trap-000003 (3578117632, 4207745280, 1062046336: 10 characters, in full)
 * obs-fieldover-000001 (123456789.0, 11 characters, as `% 1.2E+08`) cc-trap-000015
 * (-3465xxxxxx, 11, as `%-34654E+05`) cc-trap-000005 (19078xxxxxx, 11, as `% 19078E+06`). A
 * count of digits alone does not fit: 3578117632 has ten digits and prints in full. The rule
 * fits these cases and nothing more yet.
 */
export const OVERFLOW_MAX_CHARS = 10;
