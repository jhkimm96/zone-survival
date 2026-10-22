import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRunSeed } from '../src/seed.js';

const MAX_SEED = 2_000_000_000;
const noParams = new URLSearchParams('');

test('?seed를 지정하면 판 번호대로 시드가 하나씩 올라간다 (같은 조건 재현용)', () => {
  const params = new URLSearchParams('seed=5');
  assert.equal(pickRunSeed(params, 1, () => 0.5), 5);
  assert.equal(pickRunSeed(params, 2, () => 0.5), 6);
  assert.equal(pickRunSeed(params, 3, () => 0.5), 7);
});

test('?seed가 없으면 무작위 값을 쓴다', () => {
  assert.equal(pickRunSeed(noParams, 1, () => 0), 1);
  assert.equal(pickRunSeed(noParams, 1, () => 0.5), 1_000_000_001);
  assert.equal(pickRunSeed(noParams, 1, () => 0.9999999999), MAX_SEED);
});

test('무작위 시드는 판 번호와 상관없이 매번 새로 뽑는다', () => {
  const values = [0.1, 0.2, 0.3];
  const picked = values.map((value, index) => pickRunSeed(noParams, index + 1, () => value));
  assert.equal(new Set(picked).size, 3);
});

test('?seed가 숫자가 아니거나 0 이하면 무시하고 무작위로 한다', () => {
  for (const bad of ['seed=abc', 'seed=0', 'seed=-3', 'seed=', 'seed=1.5']) {
    assert.equal(pickRunSeed(new URLSearchParams(bad), 2, () => 0), 1, bad);
  }
});

test('무작위 시드는 항상 1 이상 상한 이하의 정수다', () => {
  for (let index = 0; index < 1000; index += 1) {
    const seed = pickRunSeed(noParams, 1);
    assert.ok(Number.isInteger(seed) && seed >= 1 && seed <= MAX_SEED, `seed ${seed}`);
  }
});
