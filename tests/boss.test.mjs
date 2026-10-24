import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/game.js';
import { detonateDueBombs } from '../src/bombs.js';
import { spawnBossIfDue, moveBoss, damageFromBoss } from '../src/boss.js';

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

function bossAt(run, x, y) {
  run.boss = { x, y, nextSkillTick: run.tick + 100000, nextSkill: 'ruby', rubyFireTick: null };
  return run.boss;
}

test('130초 전에는 보스가 없다', () => {
  const run = runAt(129.9);
  spawnBossIfDue(run);
  assert.equal(run.boss, null);
});

test('130초에 보스가 플레이어에서 25m 떨어진 곳에 한 마리만 나온다', () => {
  const run = runAt(130);
  spawnBossIfDue(run);
  assert.ok(Math.abs(distance(run.boss, run) - 25) < 1e-6, `d=${distance(run.boss, run)}`);
  const firstBoss = run.boss;
  run.tick += 1;
  spawnBossIfDue(run);
  assert.equal(run.boss, firstBoss);
});

test('보스는 초당 3.5m로 플레이어를 향해 움직인다', () => {
  const run = runAt(130);
  bossAt(run, 120, 100);
  for (let tick = 0; tick < 30; tick += 1) moveBoss(run);
  assert.ok(Math.abs(run.boss.x - 116.5) < 1e-6, `x=${run.boss.x}`);
  assert.ok(Math.abs(run.boss.y - 100) < 1e-6);
});

test('보스는 장애물을 통과하지 못한다', () => {
  const run = runAt(130);
  run.obstacles = [{ x: 112, y: 100, radius: 3 }];
  bossAt(run, 120, 100);
  for (let tick = 0; tick < 300; tick += 1) moveBoss(run);
  assert.ok(distance(run.boss, run.obstacles[0]) >= 3 + 1.6 - 1e-6, `d=${distance(run.boss, run.obstacles[0])}`);
});

test('보스는 폭격에 맞아도 사라지지 않는다', () => {
  const run = runAt(130);
  run.x = 50;
  bossAt(run, 120, 100);
  run.bombs = [{ x: 120, y: 100, radius: 6, detonateTick: run.tick }];
  detonateDueBombs(run);
  assert.notEqual(run.boss, null);
});

test('보스에 2m 안으로 닿으면 초당 20 피해를 입고 원인은 boss다', () => {
  const near = runAt(130);
  bossAt(near, 101.5, 100);
  for (let tick = 0; tick < 30; tick += 1) damageFromBoss(near);
  assert.ok(Math.abs(near.hp - 80) < 1e-6, `hp=${near.hp}`);
  assert.equal(near.lastDamageSource, 'boss');

  const far = runAt(130);
  bossAt(far, 103, 100);
  damageFromBoss(far);
  assert.equal(far.hp, 100);
});
