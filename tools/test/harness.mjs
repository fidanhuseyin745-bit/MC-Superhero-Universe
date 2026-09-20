/**
 * Minimal test runner and assertion library.
 *
 * There is no test dependency in this project on purpose: `npm test` has to work
 * on Termux with no network and no install step. The runner is ~50 lines and
 * supports only what the suite needs.
 */
const suites = [];
let current = null;

export function describe(name, body) {
  current = { name, tests: [] };
  suites.push(current);
  body();
  current = null;
}

export function test(name, body) {
  if (!current) throw new Error(`test("${name}") was called outside describe()`);
  current.tests.push({ name, body });
}

export function assert(condition, message = 'assertion failed') {
  if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message ?? 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message ?? 'assertDeepEqual'}: expected ${b}, got ${a}`);
}

export function assertThrows(body, message = 'expected a throw') {
  let threw = false;
  try {
    body();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

export function assertClose(actual, expected, tolerance = 1e-6, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message ?? 'assertClose'}: expected ~${expected}, got ${actual}`);
  }
}

/** Runs every registered suite and reports. Returns the failure count. */
export async function run(label = 'suite') {
  let passed = 0;
  const failures = [];

  for (const suite of suites) {
    process.stdout.write(`\n${suite.name}\n`);
    for (const item of suite.tests) {
      try {
        await item.body();
        passed += 1;
        process.stdout.write(`  ok   ${item.name}\n`);
      } catch (error) {
        failures.push({ suite: suite.name, name: item.name, error });
        process.stdout.write(`  FAIL ${item.name}\n         ${error.message}\n`);
      }
    }
  }

  process.stdout.write(`\n${label}: ${passed} passed, ${failures.length} failed\n`);
  if (failures.length > 0) {
    process.stdout.write('\nFailures:\n');
    for (const failure of failures) {
      process.stdout.write(`  ${failure.suite} > ${failure.name}\n    ${failure.error.stack ?? failure.error.message}\n`);
    }
  }
  return failures.length;
}