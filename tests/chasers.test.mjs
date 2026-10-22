import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/game.js';
import { spawnChaserIfDue, moveChasers, damageFromChasers } from '../src/chasers.js';

const TICKS_PER_SECOND = 30;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function runAt(sec) {
  const run = createRun(1);
  run.obstacles = [];
  run.x = 100;
  run.y = 100;
  run.tick = sec * TICKS_PER_SECOND;
  return run;
}

test('40초 전에는 추적자가 없다', () => {
  const run = runAt(39.9);
  spawnChaserIfDue(run);
  assert.equal(run.chasers.length, 0);
});

test('40초에 첫 추적자가 플레이어에서 35m 떨어진 곳에 생기고 다음은 12초 뒤다', () => {
  const run = runAt(40);
  spawnChaserIfDue(run);
  assert.equal(run.chasers.length, 1);
  assert.ok(Math.abs(distance(run.chasers[0], run) - 35) < 1e-6);
  assert.equal(run.nextChaserSec, 52);
  assert.equal(run.chasers[0].expireTick, run.tick + 45 * TICKS_PER_SECOND);
});

test('동시에 6마리를 넘지 않는다', () => {
  const run = runAt(40);
  for (let count = 0; count < 10; count += 1) {
    run.nextChaserSec = 0;
    spawnChaserIfDue(run);
  }
  assert.equal(run.chasers.length, 6);
});

test('수명(45초)이 지나면 사라진다', () => {
  const run = runAt(40);
  run.chasers = [{ id: 0, x: 130, y: 100, expireTick: run.tick + 10 }];
  run.tick += 9;
  moveChasers(run);
  assert.equal(run.chasers.length, 1);
  run.tick += 1;
  moveChasers(run);
  assert.equal(run.chasers.length, 0);
});

test('추적자는 초당 4.5m로 플레이어를 향해 움직인다', () => {
  const run = runAt(40);
  run.chasers = [{ id: 0, x: 130, y: 100, expireTick: run.tick + 10000 }];
  for (let tick = 0; tick < 30; tick += 1) moveChasers(run);
  assert.ok(Math.abs(run.chasers[0].x - 125.5) < 1e-6, `x=${run.chasers[0].x}`);
  assert.ok(Math.abs(run.chasers[0].y - 100) < 1e-6);
});

test('추적자는 장애물을 통과하지 못한다', () => {
  const run = runAt(40);
  run.obstacles = [{ x: 115, y: 100, radius: 3 }];
  run.chasers = [{ id: 0, x: 125, y: 100, expireTick: run.tick + 100000 }];
  for (let tick = 0; tick < 300; tick += 1) moveChasers(run);
  assert.ok(distance(run.chasers[0], run.obstacles[0]) >= 3.8 - 1e-6, `d=${distance(run.chasers[0], run.obstacles[0])}`);
});

test('1.5m 안에 닿으면 초당 20 피해를 입고, 떨어져 있으면 피해가 없다', () => {
  const near = runAt(40);
  near.chasers = [{ id: 0, x: 101, y: 100, expireTick: near.tick + 10000 }];
  for (let tick = 0; tick < 30; tick += 1) damageFromChasers(near);
  assert.ok(Math.abs(near.hp - 80) < 1e-6, `hp=${near.hp}`);
  assert.equal(near.lastDamageSource, 'chaser');

  const far = runAt(40);
  far.chasers = [{ id: 0, x: 103, y: 100, expireTick: far.tick + 10000 }];
  damageFromChasers(far);
  assert.equal(far.hp, 100);
});

test('보호 중에는 접촉 피해가 없다', () => {
  const run = runAt(40);
  run.shieldUntilTick = run.tick + 100;
  run.chasers = [{ id: 0, x: 101, y: 100, expireTick: run.tick + 10000 }];
  for (let tick = 0; tick < 30; tick += 1) damageFromChasers(run);
  assert.equal(run.hp, 100);
});
