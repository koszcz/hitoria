// Fails when a source file grows past the line limit. See CODING_STANDARDS.md, "Keep files small".
//
// Files in OVERSIZE were already too long when the check started. Each may not grow past the
// number listed. When you split one below the limit, remove it from the list.
import { Glob } from 'bun';

const LIMIT = 400;
const OVERSIZE: Record<string, number> = {};

const problems: string[] = [];
for (const pattern of ['src/**/*.ts', 'test/**/*.ts', '*.ts', 'changelog/**/*.ts', 'scripts/**/*.ts']) {
  for await (const file of new Glob(pattern).scan('.')) {
    const lines = (await Bun.file(file).text()).split('\n').length - 1;
    const cap = OVERSIZE[file] ?? LIMIT;
    if (lines > cap) problems.push(`${file} has ${lines} lines. The limit is ${cap}.`);
    else if (file in OVERSIZE && lines <= LIMIT) problems.push(`${file} is now ${lines} lines. Remove it from OVERSIZE.`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('Split the file by domain. See CODING_STANDARDS.md, "Keep files small".');
  process.exit(1);
}
console.log('File sizes OK');
