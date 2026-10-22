import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planZones, zoneAt, isInsideZone, startPositionFor } from '../src/zone.js';
import { planObstacles } from '../src/world.js';
import { planItemSpawns, applyItem } from '../src/items.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function planFor(seed) {
  const plan = planZones(seed);
  const obstacles = planObstacles(seed, startPositionFor(plan));
  return { plan, obstacles, spawns: planItemSpawns(seed, plan, obstacles) };
}

test('같은 시드는 같은 아이템 일정을 만든다', () => {
  assert.deepEqual(planFor(3).spawns, planFor(3).spawns);
});

test('아이템은 6초마다 생기고 생성 시점의 안전 원 안, 월드 안에 놓인다', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const { plan, spawns } = planFor(seed);
    assert.deepEqual(
      spawns.map((spawn) => spawn.spawnSec),
      Array.from({ length: 29 }, (_, index) => (index + 1) * 6),
      `seed ${seed}`,
    );
    for (const spawn of spawns) {
      assert.ok(isInsideZone(zoneAt(plan, spawn.spawnSec), spawn.x, spawn.y), `seed ${seed} item ${spawn.id} zone`);
      assert.ok(spawn.x >= 0 && spawn.x <= 200 && spawn.y >= 0 && spawn.y <= 200, `seed ${seed} item ${spawn.id} world`);
    }
  }
});

test('아이템은 장애물 위에 놓이지 않고, 동시에 있는 아이템끼리 3m 이상 떨어진다', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const { obstacles, spawns } = planFor(seed);
    for (const spawn of spawns) {
      for (const obstacle of obstacles) {
        assert.ok(distance(spawn, obstacle) >= obstacle.radius + 1, `seed ${seed} item ${spawn.id} obstacle`);
      }
      const alive = spawns.filter((other) => other.id !== spawn.id && other.spawnSec <= spawn.spawnSec && other.expireSec > spawn.spawnSec);
      for (const other of alive) {
        assert.ok(distance(spawn, other) >= 3, `seed ${seed} items ${spawn.id}/${other.id}`);
      }
    }
  }
});

test('동시에 맵에 있는 아이템은 최대 8개다', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const { spawns } = planFor(seed);
    for (const spawn of spawns) {
      const alive = spawns.filter((other) => other.spawnSec <= spawn.spawnSec && other.expireSec > spawn.spawnSec);
      assert.ok(alive.length <= 8, `seed ${seed}`);
    }
  }
});

test('회복은 최대 체력 100을 넘지 않는다', () => {
  const run = { hp: 90, tick: 0 };
  applyItem(run, 'heal');
  assert.equal(run.hp, 100);
});

test('가속은 8초, 보호는 5초 동안 유지된다 (초당 30틱)', () => {
  const run = { hp: 100, tick: 20 };
  applyItem(run, 'haste');
  applyItem(run, 'shield');
  assert.equal(run.hasteUntilTick, 20 + 240);
  assert.equal(run.shieldUntilTick, 20 + 150);
});
