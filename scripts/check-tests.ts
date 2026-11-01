// Fails when a test or the game breaks a test rule. See CODING_STANDARDS.md, "Write tests that
// use the real code".
import { Glob } from 'bun';

type Rule = { files: string[]; skip?: (file: string) => boolean; bad: RegExp; why: string };

const TESTS = ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'changelog/**/*.test.ts', 'ideas/**/*.test.ts'];
const RULES: Rule[] = [
  {
    files: TESTS,
    bad: /\b(mock|spyOn|jest|vi)\s*[.(]|\bsetSystemTime\b/,
    why: 'uses a mocking tool. Pass a fake in as an argument instead.',
  },
  {
    files: TESTS,
    bad: /\bglobalThis\b/,
    why: 'replaces a browser global. Pass a fake in as an argument instead.',
  },
  {
    files: TESTS,
    bad: /\b(test|it|describe)\.(only|skip)\s*\(/,
    why: 'turns tests off with .only or .skip. Remove it before you commit.',
  },
  {
    files: ['src/game/**/*.ts'],
    skip: (file) => file.endsWith('.test.ts'),
    bad: /\bMath\.random\b|\bDate\.now\b|\bperformance\.now\b/,
    why: 'reads chance or the clock. Use g.rand and game time, so tests give the same result every run.',
  },
];

const problems: string[] = [];
for (const rule of RULES) {
  for (const pattern of rule.files) {
    for await (const file of new Glob(pattern).scan('.')) {
      if (rule.skip?.(file)) continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, i) => {
        if (rule.bad.test(line)) problems.push(`${file}:${i + 1} ${rule.why}`);
      });
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('See CODING_STANDARDS.md, "Write tests that use the real code".');
  process.exit(1);
}
console.log('Test rules OK');
