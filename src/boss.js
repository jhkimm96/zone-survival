import { CONFIG } from './config.js';
import { takeDamage } from './damage.js';
import { placeAround, stepToward } from './world.js';

// 등장 시각이 되면 플레이어에서 spawnDistance 떨어진 곳에 한 번만 놓는다. 보스는 죽지 않는다.
export function spawnBossIfDue(run, config = CONFIG) {
  const rule = config.boss;
  const sec = run.tick / config.ticksPerSecond;
  if (run.boss || sec < rule.appearSec) return;

  const angle = run.threatRng() * 2 * Math.PI;
  const spot = placeAround(run, angle, rule.spawnDistance, rule.radius, run.obstacles, config);
  run.boss = { x: spot.x, y: spot.y };
}

export function moveBoss(run, config = CONFIG) {
  if (!run.boss) return;
  const rule = config.boss;
  const stepMeters = rule.speedMetersPerSec / config.ticksPerSecond;
  const next = stepToward(run.boss, run, stepMeters, rule.radius, run.obstacles, config);
  run.boss.x = next.x;
  run.boss.y = next.y;
}

export function damageFromBoss(run, config = CONFIG) {
  if (!run.boss) return;
  const rule = config.boss;
  const touching = Math.hypot(run.x - run.boss.x, run.y - run.boss.y) <= rule.contactRadius;
  if (touching) takeDamage(run, 'boss', rule.damagePerSec / config.ticksPerSecond);
}
