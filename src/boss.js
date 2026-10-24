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
  run.boss = {
    x: spot.x,
    y: spot.y,
    nextSkillTick: run.tick + rule.firstSkillDelaySec * config.ticksPerSecond,
    nextSkill: 'ruby',
    rubyFireTick: null,
  };
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

// 차례가 되면 루비 충전이나 충격파 경고 원을 시작한다. 두 기술은 번갈아 쓴다.
export function useBossSkillIfDue(run, config = CONFIG) {
  if (!run.boss || run.tick < run.boss.nextSkillTick) return;
  const rule = config.boss;
  run.boss.nextSkillTick += rule.skillEverySec * config.ticksPerSecond;

  if (run.boss.nextSkill === 'ruby') {
    run.boss.rubyFireTick = run.tick + rule.ruby.chargeSec * config.ticksPerSecond;
    run.boss.nextSkill = 'shockwave';
    return;
  }
  run.shockwaves.push({
    x: run.boss.x,
    y: run.boss.y,
    radius: rule.shockwave.radius,
    detonateTick: run.tick + Math.round(rule.shockwave.warningSec * config.ticksPerSecond),
  });
  run.boss.nextSkill = 'ruby';
}

// 충전이 끝난 순간의 플레이어 방향으로 곧게 쏜다. 따라가지 않으므로 옆으로 비켜 피할 수 있다.
export function fireChargedRuby(run, config = CONFIG) {
  if (!run.boss || run.boss.rubyFireTick === null || run.tick < run.boss.rubyFireTick) return;
  const rule = config.boss.ruby;
  const dx = run.x - run.boss.x;
  const dy = run.y - run.boss.y;
  const gap = Math.hypot(dx, dy) || 1;
  run.rubyShots.push({
    x: run.boss.x,
    y: run.boss.y,
    dx: dx / gap,
    dy: dy / gap,
    expireTick: run.tick + rule.lifetimeSec * config.ticksPerSecond,
  });
  run.boss.rubyFireTick = null;
}

// 루비는 플레이어에 맞거나, 장애물에 닿거나, 수명이 다하면 사라진다.
export function moveRubyShots(run, config = CONFIG) {
  const rule = config.boss.ruby;
  const stepMeters = rule.speedMetersPerSec / config.ticksPerSecond;
  const remaining = [];
  for (const shot of run.rubyShots) {
    if (shot.expireTick <= run.tick) continue;
    shot.x += shot.dx * stepMeters;
    shot.y += shot.dy * stepMeters;
    const hitPlayer = Math.hypot(run.x - shot.x, run.y - shot.y) <= rule.radius + config.playerRadius;
    if (hitPlayer) {
      takeDamage(run, 'ruby', rule.damage);
      continue;
    }
    const hitObstacle = run.obstacles.some(
      (obstacle) => Math.hypot(obstacle.x - shot.x, obstacle.y - shot.y) < obstacle.radius + rule.radius,
    );
    if (!hitObstacle) remaining.push(shot);
  }
  run.rubyShots = remaining;
}

export function detonateDueShockwaves(run, config = CONFIG) {
  const remaining = [];
  for (const shockwave of run.shockwaves) {
    if (shockwave.detonateTick > run.tick) {
      remaining.push(shockwave);
      continue;
    }
    const caught = Math.hypot(run.x - shockwave.x, run.y - shockwave.y) <= shockwave.radius;
    if (caught) takeDamage(run, 'shockwave', config.boss.shockwave.damage);
  }
  run.shockwaves = remaining;
}
