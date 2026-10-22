import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planZones, zoneAt, stageIndexAt, damagePerSecondAt, isInsideZone, upcomingZoneAt, startPositionFor,
} from '../src/zone.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isInside = (outer, inner) => distance(outer.center, inner.center) + inner.radius <= outer.radius + 1e-9;

test('같은 시드는 같은 자기장 계획을 만든다', () => {
  assert.deepEqual(planZones(7), planZones(7));
});

test('모든 시드에서 단계 원은 서로 포함되고 최종 원 중심은 월드 안쪽이다', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const plan = planZones(seed);
    const [first, second, final] = plan.stages.map((stage) => stage.circle);
    assert.ok(isInside(plan.initial, first), `seed ${seed} first`);
    assert.ok(isInside(first, second), `seed ${seed} second`);
    assert.ok(isInside(second, final), `seed ${seed} final`);
    assert.ok(final.center.x >= 60 && final.center.x <= 140, `seed ${seed} final x`);
    assert.ok(final.center.y >= 60 && final.center.y <= 140, `seed ${seed} final y`);
  }
});

test('시작 전 자기장은 월드 전체를 덮고, 단계 시작 후 20초 동안 선형으로 줄어든다', () => {
  const plan = planZones(1);
  assert.equal(zoneAt(plan, 0).radius, 142);
  assert.equal(zoneAt(plan, 30).radius, 142);
  assert.equal(zoneAt(plan, 40).radius, (142 + 90) / 2);
  assert.equal(zoneAt(plan, 50).radius, 90);
  assert.equal(zoneAt(plan, 60).radius, 90);
  assert.equal(zoneAt(plan, 130).radius, 20);
  assert.equal(zoneAt(plan, 179).radius, 20);
});

test('줄어드는 중에는 shrinking이고 목표 원을 알려준다', () => {
  const plan = planZones(1);
  assert.equal(zoneAt(plan, 40).shrinking, true);
  assert.deepEqual(zoneAt(plan, 40).target, plan.stages[0].circle);
  assert.equal(zoneAt(plan, 60).shrinking, false);
  assert.equal(zoneAt(plan, 60).target, null);
});

test('줄어드는 동안에도 원은 이전 단계 원 안에 머문다', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const plan = planZones(seed);
    const before = zoneAt(plan, 70);
    for (const sec of [75, 80, 85, 89.9]) {
      assert.ok(isInside(before, zoneAt(plan, sec)), `seed ${seed} sec ${sec}`);
    }
  }
});

test('시각별 단계와 피해량이 수치표와 같다', () => {
  const plan = planZones(1);
  assert.equal(stageIndexAt(plan, 29.9), 0);
  assert.equal(stageIndexAt(plan, 30), 1);
  assert.equal(stageIndexAt(plan, 110), 3);
  assert.deepEqual(
    [0, 30, 70, 110].map((sec) => damagePerSecondAt(plan, sec)),
    [0, 5, 8, 12],
  );
});

test('원 안에 있는지 거리로 판정한다', () => {
  const circle = { center: { x: 100, y: 100 }, radius: 10 };
  assert.equal(isInsideZone(circle, 105, 100), true);
  assert.equal(isInsideZone(circle, 111, 100), false);
});

test('예고는 단계 시작 10초 전부터, 깜빡임은 5초 전부터, 마지막 단계 뒤에는 없다', () => {
  const plan = planZones(1);
  assert.equal(upcomingZoneAt(plan, 19), null);
  assert.equal(upcomingZoneAt(plan, 20).blinking, false);
  assert.equal(upcomingZoneAt(plan, 25).blinking, true);
  assert.deepEqual(upcomingZoneAt(plan, 25).circle, plan.stages[0].circle);
  assert.equal(upcomingZoneAt(plan, 115), null);
});

test('시작 위치는 최종 원에서 가장 먼 모서리 안쪽 5m다', () => {
  const corners = [{ x: 5, y: 5 }, { x: 195, y: 5 }, { x: 5, y: 195 }, { x: 195, y: 195 }];
  for (let seed = 1; seed <= 200; seed += 1) {
    const plan = planZones(seed);
    const finalCenter = plan.stages[2].circle.center;
    const start = startPositionFor(plan);
    assert.ok(corners.some((corner) => corner.x === start.x && corner.y === start.y), `seed ${seed}`);
    for (const corner of corners) {
      assert.ok(distance(corner, finalCenter) <= distance(start, finalCenter) + 1e-9, `seed ${seed}`);
    }
  }
});

test('모서리까지 거리가 모두 같으면 목록 순서가 앞선 모서리를 고른다', () => {
  const plan = { stages: [{}, {}, { circle: { center: { x: 100, y: 100 }, radius: 20 } }] };
  assert.deepEqual(startPositionFor(plan), { x: 5, y: 5 });
});
