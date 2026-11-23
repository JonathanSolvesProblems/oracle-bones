// Single precision. QuickBASIC 4.5 keeps intermediate results in the 8087's wider format and
// rounds to single precision when it stores a variable. The solver computes each expression in
// double precision and calls `store` where QUICK-2 would store a named quantity.

/** Round to the nearest single-precision value, as a store to a QuickBASIC single does. */
export const store = Math.fround;

/** Whether a value is already exactly representable in single precision. */
export function isSingle(x: number): boolean {
  return Math.fround(x) === x;
}
