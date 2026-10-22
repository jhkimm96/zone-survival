import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/game.js';
import { spawnBombSalvoIfDue, detonateDueBombs } from '../src/bombs.js';

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

test('20초 전에는 폭격이 없다', () => {
  const run = runAt(19.9);
  spawnBombSalvoIfDue(run);
  assert.equal(run.bombs.length, 0);
});

test('20초에 첫 폭격이 생기고 다음은 8초 뒤다', () => {
  const run = runAt(20);
  spawnBombSalvoIfDue(run);
  assert.equal(run.bombs.length, 2);
  assert.equal(run.nextBombSec, 28);
  spawnBombSalvoIfDue(run);
  assert.equal(run.bombs.length, 2);
});

test('폭격 개수는 자기장 단계에 따라 2, 3, 4, 5개다', () => {
  const counts = [20, 40, 80, 120].map((sec) => {
    const run = runAt(sec);
    run.nextBombSec = 0;
    spawnBombSalvoIfDue(run);
    return run.bombs.length;
  });
  assert.deepEqual(counts, [2, 3, 4, 5]);
});

test('폭격 원은 플레이어 주변 14m 안에 반지름 6m로 놓이고 2.5초 뒤 터진다', () => {
  const run = runAt(120);
  run.nextBombSec = 0;
  spawnBombSalvoIfDue(run);
  for (const bomb of run.bombs) {
    assert.ok(distance(bomb, run) <= 14 + 1e-9);
    assert.equal(bomb.radius, 6);
    assert.equal(bomb.detonateTick, run.tick + 75);
  }
});

test('같은 시드와 같은 상황이면 같은 폭격 위치가 나온다', () => {
  const first = runAt(40);
  const second = runAt(40);
  first.nextBombSec = 0;
  second.nextBombSec = 0;
  spawnBombSalvoIfDue(first);
  spawnBombSalvoIfDue(second);
  assert.deepEqual(first.bombs, second.bombs);
});

test('예고 시간이 지나면 폭발해 원 안에 있는 플레이어가 35 피해를 입고 폭격은 사라진다', () => {
  const run = runAt(30);
  run.bombs = [{ x: 100, y: 100, radius: 6, detonateTick: run.tick + 75 }];
  run.tick += 74;
  detonateDueBombs(run);
  assert.equal(run.hp, 100);
  assert.equal(run.bombs.length, 1);
  run.tick += 1;
  detonateDueBombs(run);
  assert.equal(run.hp, 65);
  assert.equal(run.bombs.length, 0);
  assert.equal(run.damageTaken.bomb, 35);
  assert.equal(run.lastDamageSource, 'bomb');
});

test('폭발 원 밖에 있으면 피해가 없다', () => {
  const run = runAt(30);
  run.bombs = [{ x: 120, y: 100, radius: 6, detonateTick: run.tick }];
  detonateDueBombs(run);
  assert.equal(run.hp, 100);
  assert.equal(run.bombs.length, 0);
});

test('보호 중에는 폭발 피해가 없다', () => {
  const run = runAt(30);
  run.shieldUntilTick = run.tick + 10;
  run.bombs = [{ x: 100, y: 100, radius: 6, detonateTick: run.tick }];
  detonateDueBombs(run);
  assert.equal(run.hp, 100);
});
