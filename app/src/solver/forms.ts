// Prompt order for each mode and shape, keyed by the input names of the oracle contract.

/** Normal Depth, Trapezoidal Channel (glossary: Trapezoid form; criterion 4.3). */
export const ND_TRAPEZOID_PROMPTS = ['left_slope', 'right_slope', 'bottom_width', 'n', 'discharge', 'slope'] as const;

/**
 * Normal Depth, Irregular Channel: after the ground points, the LEFT and RIGHT bank stations,
 * the LEFT, CHANNEL and RIGHT n values, the Discharge and the Slope (criterion 3.3).
 */
export const ND_IRREGULAR_PROMPTS = ['bank_left', 'bank_right', 'n_left', 'n_channel', 'n_right', 'discharge', 'slope'] as const;
