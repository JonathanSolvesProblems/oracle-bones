// The node entry the oracle comparator runs: `node app/src/oracle/entry.ts`. Reads one request
// per line from stdin and writes one response per line to stdout (see contract.ts).
import { createInterface } from 'node:readline';
import { solve } from '../solver/index.ts';
import { respond } from './contract.ts';

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  const res = respond(line, solve);
  if (res) process.stdout.write(JSON.stringify(res) + '\n');
}
