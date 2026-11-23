// The solver's data model (design: Data model).

export type Mode = 'normal_depth' | 'critical_depth' | 'channel_capacity' | 'step_backwater';
export type Shape = 'trapezoid' | 'v_ditch' | 'rectangle' | 'circle' | 'irregular';

export interface Job {
  mode: Mode;
  shape: Shape;
  /** Typed text, keyed as in the goldens. */
  inputs: Readonly<Record<string, string>>;
}

export type FlagCode =
  | 'extended_section'
  | 'cut_off_area_counted'
  | 'negative_input'
  | 'never_finishes'
  | 'returns_to_menu';

export interface Flag { code: FlagCode; text: string; fields: string[]; }

export interface Result {
  outcome: 'result' | 'rejected' | 'error';
  /** Field name to the field's window text, untrimmed, as on screen. */
  printed: Record<string, string>;
  /** The program's own text, when it shows one. */
  message: string | null;
  /** The prompt QUICK-2 holds, for outcome `rejected`. */
  held: string | null;
  /** Odd behaviours, for the app to label. */
  flags: Flag[];
  /** Unrounded values, for the app and for hauntings. */
  raw: Record<string, number>;
}

export function rejected(held: string | null, message: string | null = null): Result {
  return { outcome: 'rejected', printed: {}, message, held, flags: [], raw: {} };
}

export function failed(message: string | null, flags: Flag[] = []): Result {
  return { outcome: 'error', printed: {}, message, held: null, flags, raw: {} };
}
