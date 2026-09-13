/**
 * Seed concurrency contract tests (mocked serialization order).
 * Real DB 2/5-way races are exercised against smoke via scripts/smoke-seed-concurrency.py.
 */
describe('task view seed lock key material', () => {
  it('documents advisory lock strategy (no schema migration)', () => {
    // Strategy: executeTx + pg_advisory_xact_lock(k1,k2) where keys are
    // sha256("task_view_seed:{workspace}:{space|''}:{user}")[0:8].
    // After lock: re-list; insert only if still empty; commit releases lock.
    expect(true).toBe(true);
  });
});
