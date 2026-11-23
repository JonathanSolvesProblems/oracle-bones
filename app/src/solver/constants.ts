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
 * The 2/3 power as `.667`: the regular-shape search discharge, Channel Capacity velocity and
 * Critical Slope.
 * @cite nd-trap-000001 nd-trap-000002 (Normal Depth 47 of 53 with .667, 16 with .6667)
 * cc-vdit-000012 (velocity 5104.8)
 */
export const EXP_A = 0.667;

/**
 * The 2/3 power as `.6667`: Channel Capacity discharge, Max Discharge, irregular conveyance.
 * @cite nd-irr-000001 nd-irr-000002 nd-irr-000010 (irregular Normal Depth 24 of 24 with .6667,
 * 10 with .667)
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
 * An overflowing value prints as `%` and its digits while it needs at most this many digits,
 * counting those before and after the point; past that QuickBASIC prints an exponent.
 * @cite cc-rect-000002 (793879552 in full) obs-fieldover-000001 (123456789 as `% 1.2E+08`)
 * cc-trap-000015 (`%-34654E+05`); the threshold fits these three cases and nothing more yet
 */
export const OVERFLOW_MAX_DIGITS = 9;
