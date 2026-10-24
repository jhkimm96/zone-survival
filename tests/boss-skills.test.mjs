import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/game.js';
import {
  spawnBossIfDue,
  useBossSkillIfDue,
  fireChargedRuby,
  moveRubyShots,
  detonateDueShockwaves,
} from '../src/boss.js';

const TICKS_PER_SECOND = 30;

function runWithBossAt(bossX, bossY) {
  const run = createRun(1);
  run.obstacles = [];
  run.x = 100;
  run.y = 100;
  run.tick = 130 * TICKS_PER_SECOND;
  run.boss = { x: bossX, y: bossY, nextSkillTick: run.tick, nextSkill: 'ruby', rubyFireTick: null };
  return run;
}

function shotAt(run, x, y, dx, dy) {
  run.rubyShots = [{ x, y, dx, dy, expireTick: run.tick + 4 * TICKS_PER_SECOND }];
}

test('보스 기술은 등장 4초 뒤 루비부터 8초마다 루비와 충격파를 번갈아 쓴다', () => {
  const run = createRun(1);
  run.obstacles = [];
  run.x = 100;
  run.y = 100;
  run.tick = 130 * TICKS_PER_SECOND;
  spawnBossIfDue(run);
  assert.equal(run.boss.nextSkillTick, run.tick + 4 * TICKS_PER_SECOND);

  const used = [];
  for (let tick = 130 * TICKS_PER_SECOND; tick < 160 * TICKS_PER_SECOND; tick += 1) {
    run.tick = tick;
    const shockwavesBefore = run.shockwaves.length;
    const chargingBefore = run.boss.rubyFireTick;
    useBossSkillIfDue(run);
    if (run.boss.rubyFireTick !== chargingBefore) used.push(['ruby', run.tick / TICKS_PER_SECOND]);
    if (run.shockwaves.length > shockwavesBefore) used.push(['shockwave', run.tick / TICKS_PER_SECOND]);
    run.boss.rubyFireTick = null;
  }
  assert.deepEqual(used, [['ruby', 134], ['shockwave', 142], ['ruby', 150], ['shockwave', 158]]);
});

test('루비는 1초 충전 뒤 그때 플레이어가 있던 쪽으로 날아간다', () => {
  const run = runWithBossAt(120, 100);
  useBossSkillIfDue(run);
  assert.equal(run.boss.rubyFireTick, run.tick + TICKS_PER_SECOND);

  run.tick += TICKS_PER_SECOND - 1;
  fireChargedRuby(run);
  assert.equal(run.rubyShots.length, 0);

  run.tick += 1;
  run.x = 120;
  run.y = 80;
  fireChargedRuby(run);
  assert.equal(run.rubyShots.length, 1);
  assert.equal(run.boss.rubyFireTick, null);
  assert.ok(Math.abs(run.rubyShots[0].dx - 0) < 1e-9);
  assert.ok(Math.abs(run.rubyShots[0].dy - -1) < 1e-9);
});

test('루비는 초당 8m로 곧게 날아간다', () => {
  const run = runWithBossAt(150, 150);
  run.x = 0;
  run.y = 0;
  shotAt(run, 120, 100, 1, 0);
  for (let tick = 0; tick < 30; tick += 1) moveRubyShots(run);
  assert.ok(Math.abs(run.rubyShots[0].x - 128) < 1e-6, `x=${run.rubyShots[0].x}`);
});

test('루비에 맞으면 20 피해를 입고 원인은 ruby이며 탄은 사라진다', () => {
  const run = runWithBossAt(150, 150);
  shotAt(run, 101, 100, -1, 0);
  moveRubyShots(run);
  assert.equal(run.hp, 80);
  assert.equal(run.lastDamageSource, 'ruby');
  assert.equal(run.rubyShots.length, 0);
});

test('루비는 장애물에 닿으면 사라진다', () => {
  const run = runWithBossAt(150, 150);
  run.obstacles = [{ x: 115, y: 100, radius: 3 }];
  shotAt(run, 118.6, 100, -1, 0);
  moveRubyShots(run);
  assert.equal(run.rubyShots.length, 0);
  assert.equal(run.hp, 100);
});

test('루비는 4초가 지나면 사라진다', () => {
  const run = runWithBossAt(150, 150);
  run.x = 0;
  run.y = 0;
  shotAt(run, 60, 100, 1, 0);
  run.tick += 4 * TICKS_PER_SECOND - 1;
  moveRubyShots(run);
  assert.equal(run.rubyShots.length, 1);
  run.tick += 1;
  moveRubyShots(run);
  assert.equal(run.rubyShots.length, 0);
});

test('충격파는 보스 위치에 반지름 7m 경고 원을 놓고 1.5초 뒤 안에 있으면 25 피해를 준다', () => {
  const run = runWithBossAt(105, 100);
  run.boss.nextSkill = 'shockwave';
  useBossSkillIfDue(run);
  assert.deepEqual(run.shockwaves, [{ x: 105, y: 100, radius: 7, detonateTick: run.tick + 45 }]);

  run.tick += 44;
  detonateDueShockwaves(run);
  assert.equal(run.hp, 100);
  run.tick += 1;
  detonateDueShockwaves(run);
  assert.equal(run.hp, 75);
  assert.equal(run.lastDamageSource, 'shockwave');
  assert.equal(run.shockwaves.length, 0);
});

test('충격파 원 밖에 있으면 피해가 없다', () => {
  const run = runWithBossAt(108, 100);
  run.shockwaves = [{ x: 108, y: 100, radius: 7, detonateTick: run.tick }];
  detonateDueShockwaves(run);
  assert.equal(run.hp, 100);
});

test('보호막이 켜져 있으면 루비와 충격파 피해를 받지 않는다', () => {
  const run = runWithBossAt(100, 100);
  run.shieldUntilTick = run.tick + 100;
  shotAt(run, 101, 100, -1, 0);
  run.shockwaves = [{ x: 100, y: 100, radius: 7, detonateTick: run.tick }];
  moveRubyShots(run);
  detonateDueShockwaves(run);
  assert.equal(run.hp, 100);
});
