import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, activeItems } from '../src/game.js';
import { startPositionFor, zoneAt, isInsideZone } from '../src/zone.js';
import { buildRunRecord, toLogLine } from '../src/runlog.js';

const RIGHT = { dx: 1, dy: 0 };
const LEFT = { dx: -1, dy: 0 };
const DIAGONAL = { dx: 1, dy: 1 };
const TICKS_PER_SECOND = 30;

function runIdle(seed) {
  const run = createRun(seed);
  while (run.status === 'playing') step(run, null);
  return run;
}

// 다른 규칙과 섞이지 않도록 폭격과 추적자를 끈 빈 땅의 판
function freeRunAt(x, y) {
  const run = createRun(1);
  run.obstacles = [];
  run.spawns = [];
  run.nextBombSec = Infinity;
  run.nextChaserSec = Infinity;
  run.x = x;
  run.y = y;
  return run;
}

function walk(run, direction, seconds) {
  const startX = run.x;
  const startY = run.y;
  for (let tick = 0; tick < seconds * TICKS_PER_SECOND; tick += 1) step(run, direction);
  return Math.hypot(run.x - startX, run.y - startY);
}

test('시작 위치는 최종 원에서 가장 먼 모서리 안쪽이다', () => {
  const run = createRun(5);
  assert.deepEqual({ x: run.x, y: run.y }, startPositionFor(run.plan));
});

test('가만히 있으면 어떤 시드에서도 클리어하지 못한다', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const run = runIdle(seed);
    assert.equal(run.status, 'dead', `seed ${seed}`);
    assert.ok(['zone', 'bomb', 'chaser'].includes(run.deathCause), `seed ${seed} cause ${run.deathCause}`);
  }
});

test('같은 시드와 같은 입력이면 같은 결과가 나온다', () => {
  const first = runIdle(9);
  const second = runIdle(9);
  assert.equal(first.tick, second.tick);
  assert.equal(first.hp, second.hp);
  assert.equal(first.deathCause, second.deathCause);
  assert.deepEqual(first.damageTaken, second.damageTaken);
});

test('이동은 초당 6m이고 대각선도 같은 속도다', () => {
  assert.ok(Math.abs(walk(freeRunAt(50, 50), RIGHT, 1) - 6) < 0.01);
  assert.ok(Math.abs(walk(freeRunAt(50, 50), DIAGONAL, 1) - 6) < 0.01);
});

test('가속 중에는 이동 속도가 1.5배다', () => {
  const run = freeRunAt(50, 50);
  run.hasteUntilTick = 1000;
  assert.ok(Math.abs(walk(run, RIGHT, 1) - 9) < 0.01);
});

test('월드 경계 밖으로 나가지 않는다', () => {
  const run = freeRunAt(2, 100);
  walk(run, LEFT, 3);
  assert.ok(run.x >= 0.6 - 1e-9, `x=${run.x}`);
});

test('장애물을 통과하지 못한다', () => {
  const run = freeRunAt(50, 50);
  run.obstacles = [{ x: 56, y: 50, radius: 2 }];
  walk(run, RIGHT, 3);
  assert.ok(Math.hypot(run.x - 56, run.y - 50) >= 2.6 - 1e-6, `x=${run.x}`);
});

test('아이템 획득 반경 2m 안에서만 먹고, 한 번만 먹는다', () => {
  const run = freeRunAt(50, 50);
  run.spawns = [
    { id: 0, kind: 'heal', x: 51.5, y: 50, spawnSec: 0, expireSec: 45 },
    { id: 1, kind: 'haste', x: 53, y: 50, spawnSec: 0, expireSec: 45 },
  ];
  run.hp = 50;
  step(run, null);
  assert.equal(run.hp, 75);
  assert.equal(run.itemsGot.heal, 1);
  assert.equal(run.itemsGot.haste, 0);
  assert.equal(activeItems(run).length, 1);
  step(run, null);
  assert.equal(run.hp, 75);
});

test('보호 중에는 영역 밖에 있어도 피해가 없다', () => {
  const run = freeRunAt(1, 1);
  run.tick = 3600;
  run.shieldUntilTick = 3600 + 150;
  for (let tick = 0; tick < 150; tick += 1) step(run, null);
  assert.equal(run.hp, 100);
  assert.equal(run.outsideTicks, 150);
});

test('영역 밖에서는 단계 피해량(3단계 12/초)만큼 체력이 줄고 영역 밖 시간이 센다', () => {
  const run = freeRunAt(1, 1);
  run.tick = 3600;
  assert.equal(isInsideZone(zoneAt(run.plan, 120), 1, 1), false);
  for (let tick = 0; tick < 30; tick += 1) step(run, null);
  assert.ok(Math.abs(run.hp - 88) < 1e-6, `hp=${run.hp}`);
  assert.equal(run.outsideTicks, 30);
  assert.ok(Math.abs(run.damageTaken.zone - 12) < 1e-6);
});

test('폭격에 맞아 죽으면 사망 원인이 bomb이다', () => {
  const run = freeRunAt(100, 100);
  run.tick = 900;
  run.hp = 30;
  run.bombs = [{ x: 100, y: 100, radius: 6, detonateTick: 900 }];
  step(run, null);
  assert.equal(run.status, 'dead');
  assert.equal(run.deathCause, 'bomb');
});

test('추적자에게 죽으면 사망 원인이 chaser이다', () => {
  const run = freeRunAt(100, 100);
  run.tick = 900;
  run.hp = 0.5;
  run.chasers = [{ id: 0, x: 100.5, y: 100, expireTick: 100000 }];
  step(run, null);
  assert.equal(run.status, 'dead');
  assert.equal(run.deathCause, 'chaser');
});

test('끝난 판의 기록에는 분석에 필요한 필드가 모두 있다', () => {
  const run = runIdle(1);
  const record = buildRunRecord(run, { player: 'A', playerId: 'abc-123', runNumber: 2, note: '어려웠다' });
  assert.equal(record.playerId, 'abc-123');
  assert.equal(record.cleared, false);
  assert.equal(record.deathStage, run.deathStage);
  assert.equal(record.deathCause, run.deathCause);
  assert.equal(record.player, 'A');
  assert.equal(record.version, 'v0.5');
  assert.equal(record.chasersKilled, run.chasersKilled);
  assert.equal(typeof record.deathPos.x, 'number');
  assert.deepEqual(Object.keys(record.damageTaken).sort(), ['bomb', 'chaser', 'zone']);
  assert.deepEqual(JSON.parse(toLogLine(record)), record);
});
