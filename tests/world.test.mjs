import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planObstacles, pushOutOfObstacles, keepInsideWorld } from '../src/world.js';

const START = { x: 5, y: 5 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('같은 시드는 같은 장애물을 만든다', () => {
  assert.deepEqual(planObstacles(4, START), planObstacles(4, START));
});

test('장애물은 40개이고 반지름 1.5~3m이며 월드 안에 있다', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const obstacles = planObstacles(seed, START);
    assert.equal(obstacles.length, 40, `seed ${seed}`);
    for (const obstacle of obstacles) {
      assert.ok(obstacle.radius >= 1.5 && obstacle.radius <= 3, `seed ${seed} radius`);
      assert.ok(obstacle.x - obstacle.radius >= 0 && obstacle.x + obstacle.radius <= 200, `seed ${seed} x`);
      assert.ok(obstacle.y - obstacle.radius >= 0 && obstacle.y + obstacle.radius <= 200, `seed ${seed} y`);
    }
  }
});

test('시작점 주변 10m 안에는 장애물이 없다', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    for (const obstacle of planObstacles(seed, START)) {
      assert.ok(distance(obstacle, START) - obstacle.radius >= 10, `seed ${seed}`);
    }
  }
});

test('장애물끼리 겹치지 않는다', () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const obstacles = planObstacles(seed, START);
    for (let first = 0; first < obstacles.length; first += 1) {
      for (let second = first + 1; second < obstacles.length; second += 1) {
        const gap = distance(obstacles[first], obstacles[second]) - obstacles[first].radius - obstacles[second].radius;
        assert.ok(gap >= 0, `seed ${seed} ${first}-${second}`);
      }
    }
  }
});

test('장애물과 겹친 위치는 장애물 밖으로 밀려나고, 겹치지 않은 위치는 그대로다', () => {
  const obstacles = [{ x: 50, y: 50, radius: 2 }];
  const pushed = pushOutOfObstacles({ x: 51, y: 50 }, 0.6, obstacles);
  assert.ok(distance(pushed, obstacles[0]) >= 2.6 - 1e-9);
  const untouched = pushOutOfObstacles({ x: 60, y: 50 }, 0.6, obstacles);
  assert.deepEqual(untouched, { x: 60, y: 50 });
});

test('장애물 중심과 정확히 같은 위치여도 밖으로 밀려난다', () => {
  const obstacles = [{ x: 50, y: 50, radius: 2 }];
  const pushed = pushOutOfObstacles({ x: 50, y: 50 }, 0.6, obstacles);
  assert.ok(distance(pushed, obstacles[0]) >= 2.6 - 1e-9);
});

test('월드 경계 밖으로 나가지 못한다', () => {
  assert.deepEqual(keepInsideWorld({ x: -5, y: 300 }, 0.6), { x: 0.6, y: 199.4 });
  assert.deepEqual(keepInsideWorld({ x: 100, y: 100 }, 0.6), { x: 100, y: 100 });
});
