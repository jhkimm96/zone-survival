import { CONFIG } from './config.js';
import { takeDamage } from './damage.js';
import { keepInsideWorld } from './world.js';
import { stageIndexAt } from './zone.js';

// 폭격 시각이 되면 플레이어 주변에 예고 원 여러 개를 놓는다. 원은 warningSec 뒤에 터진다.
export function spawnBombSalvoIfDue(run, config = CONFIG) {
  const rule = config.bombs;
  const sec = run.tick / config.ticksPerSecond;
  if (sec < run.nextBombSec) return;
  run.nextBombSec += rule.everySec;

  const salvoSize = rule.salvoSizeByStage[stageIndexAt(run.plan, sec)];
  for (let index = 0; index < salvoSize; index += 1) {
    const angle = run.threatRng() * 2 * Math.PI;
    const distance = Math.sqrt(run.threatRng()) * rule.aimRadius;
    const target = keepInsideWorld(
      { x: run.x + Math.cos(angle) * distance, y: run.y + Math.sin(angle) * distance },
      0,
      config,
    );
    run.bombs.push({
      x: target.x,
      y: target.y,
      radius: rule.radius,
      detonateTick: run.tick + Math.round(rule.warningSec * config.ticksPerSecond),
    });
  }
}

// 터질 때가 된 폭격은 원 안에 플레이어가 있으면 피해를 주고 사라진다.
export function detonateDueBombs(run, config = CONFIG) {
  const remaining = [];
  for (const bomb of run.bombs) {
    if (bomb.detonateTick > run.tick) {
      remaining.push(bomb);
      continue;
    }
    const caught = Math.hypot(run.x - bomb.x, run.y - bomb.y) <= bomb.radius;
    if (caught) takeDamage(run, 'bomb', config.bombs.damage);
  }
  run.bombs = remaining;
}
