// The JSONL entry the oracle comparator runs. Task 1.5 fills it in; for now it answers every
// request with outcome `error` and message `not built`.
import { createInterface } from 'node:readline';

interface Request { id: string; }

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (line.trim() === '') continue;
  const req = JSON.parse(line) as Request;
  process.stdout.write(JSON.stringify({ id: req.id, outcome: 'error', printed: {}, message: 'not built' }) + '\n');
}
