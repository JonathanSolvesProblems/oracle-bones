// Property 7: same code, same answer, no ids. For any batch of golden requests with ids
// renamed and order shuffled, the entry's response for each input equals solve() called
// directly on that input.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { solve } from '../src/solver/index.ts';
import { goldens } from './golden.ts';

const entry = fileURLToPath(new URL('../src/oracle/entry.ts', import.meta.url));
const inputs = goldens()
  .filter((g) => g.outcome !== 'observed')
  .map((g) => ({ mode: g.mode, shape: g.shape, inputs: g.inputs }));

describe('Property 7', () => {
  it('renamed and shuffled ids change nothing', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: inputs.length, maxLength: inputs.length }),
        fc.array(fc.integer(), { minLength: inputs.length, maxLength: inputs.length }),
        (ids, keys) => {
          const order = inputs.map((_, i) => i).sort((a, b) => keys[a]! - keys[b]! || a - b);
          const batch = order.map((i) => ({ id: ids[i]!, ...inputs[i]! }));
          const out = execFileSync(process.execPath, [entry], {
            input: batch.map((r) => JSON.stringify(r)).join('\n') + '\n', maxBuffer: 1 << 26,
          }).toString().split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
          const byId = new Map(out.map((r) => [r.id as string, r]));
          for (const req of batch) {
            const direct = solve({ mode: req.mode as never, shape: req.shape as never, inputs: req.inputs });
            expect(byId.get(req.id)).toEqual({ id: req.id, outcome: direct.outcome, printed: direct.printed, message: direct.message });
          }
        },
      ),
      { numRuns: 5 },
    );
  });
});
