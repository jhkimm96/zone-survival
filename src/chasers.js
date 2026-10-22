import { CONFIG } from './config.js';
import { takeDamage } from './damage.js';
import { keepInsideWorld, pushOutOfObstacles } from './world.js';

// 추적자 생성 시각이 되면(동시에 maxAlive 마리까지) 플레이어에서 spawnDistance 떨어진 곳에 하나 놓는다.
export function spawnChaserIfDue(run, config = CONFIG) {
  const rule = config.chasers;
  const sec = run.tick / config.ticksPerSecond;
  if (sec < run.nextChaserSec) return;
  run.nextChaserSec += rule.everySec;
  if (run.chasers.length >= rule.maxAlive) return;

  const angle = run.threatRng() * 2 * Math.PI;
  const spawn = keepInsideWorld(
    { x: run.x + Math.cos(angle) * rule.spawnDistance, y: run.y + Math.sin(angle) * rule.spawnDistance },
    rule.radius,
    config,
  );
  const clearOfObstacles = pushOutOfObstacles(spawn, rule.radius, run.obstacles);
  run.chasers.push({
    id: run.nextChaserId,
    x: clearOfObstacles.x,
    y: clearOfObstacles.y,
    expireTick: run.tick + rule.lifetimeSec * config.ticksPerSecond,
  });
  run.nextChaserId += 1;
}

// 수명이 다한 추적자는 지우고, 나머지는 플레이어 쪽으로 한 걸음 움직인다. 장애물은 통과하지 못한다.
export function moveChasers(run, config = CONFIG) {
  const rule = config.chasers;
  run.chasers = run.chasers.filter((chaser) => chaser.expireTick > run.tick);
  const stepMeters = rule.speedMetersPerSec / config.ticksPerSecond;
  for (const chaser of run.chasers) {
    const dx = run.x - chaser.x;
    const dy = run.y - chaser.y;
    const gap = Math.hypot(dx, dy);
    if (gap === 0) continue;
    const moved = { x: chaser.x + (dx / gap) * stepMeters, y: chaser.y + (dy / gap) * stepMeters };
    const clearOfObstacles = pushOutOfObstacles(moved, rule.radius, run.obstacles);
    const inWorld = keepInsideWorld(clearOfObstacles, rule.radius, config);
    chaser.x = inWorld.x;
    chaser.y = inWorld.y;
  }
}

export function damageFromChasers(run, config = CONFIG) {
  const rule = config.chasers;
  for (const chaser of run.chasers) {
    const touching = Math.hypot(run.x - chaser.x, run.y - chaser.y) <= rule.contactRadius;
    if (touching) takeDamage(run, 'chaser', rule.damagePerSec / config.ticksPerSecond);
  }
}
