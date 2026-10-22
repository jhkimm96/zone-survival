// 사람이 아닌 봇으로 시드 1~500을 돌려 클리어율을 본다. 실행: node docs/balance/bot-sim.mjs
// 봇은 장애물을 돌아가지 못해 막히면 옆으로 조금 비켜 걷는다. 규칙이 얼마나 느슨한지 보는 용도이며 사람의 난이도가 아니다.
import { activeItems, createRun, step } from '../../src/game.js';
import { isInsideZone, upcomingZoneAt, zoneAt } from '../../src/zone.js';

const SEEDS = 500;
const TICKS_PER_SECOND = 30;
const ARRIVED_METERS = 3;
const SIDESTEP_TICKS = 20;
const BOMB_FLEE_MARGIN_METERS = 4;
const CHASER_FLEE_METERS = 10;
const ZONE_EDGE_METERS = 8;
const ITEM_SEEK_METERS = 25;

const unit = (dx, dy) => {
  const length = Math.hypot(dx, dy);
  return length === 0 ? { dx: 0, dy: 0 } : { dx: dx / length, dy: dy / length };
};

function directionToward(run, target) {
  const dx = target.x - run.x;
  const dy = target.y - run.y;
  return Math.hypot(dx, dy) <= ARRIVED_METERS ? null : { dx, dy };
}

// 직전과 거의 같은 자리면 장애물에 막힌 것으로 보고 한동안 수직 방향으로 걷는다.
function withSidestep(decide) {
  let last = null;
  let sidestepTicks = 0;
  let sidestepSign = 1;
  return (run) => {
    const direction = decide(run);
    const moved = last ? Math.hypot(run.x - last.x, run.y - last.y) : Infinity;
    last = { x: run.x, y: run.y };
    if (!direction) return null;
    if (sidestepTicks > 0) {
      sidestepTicks -= 1;
      return { dx: -direction.dy * sidestepSign, dy: direction.dx * sidestepSign };
    }
    if (moved < 0.05) {
      sidestepTicks = SIDESTEP_TICKS;
      sidestepSign = -sidestepSign;
    }
    return direction;
  };
}

// 체력이 낮으면 가까운 회복을, 아니면 가까운 보호·가속을 먹으러 간다 (사람처럼 아이템을 쓰는 단순한 흉내)
function wantedItem(run) {
  const nearby = activeItems(run).filter((item) => Math.hypot(item.x - run.x, item.y - run.y) < ITEM_SEEK_METERS);
  const preferred = run.hp < 60 ? ['heal', 'shield', 'haste'] : ['shield', 'haste', 'heal'];
  for (const kind of preferred) {
    const match = nearby.find((item) => item.kind === kind);
    if (match) return match;
  }
  return null;
}

// 폭격 원에 가까우면 그 중심에서 멀어지는 방향을, 추적자가 가까우면 반대 방향을 더한다.
function withDodging(decide) {
  return (run) => {
    const base = decide(run);
    const zone = zoneAt(run.plan, run.tick / TICKS_PER_SECOND);
    const edgeMargin = zone.radius - Math.hypot(run.x - zone.center.x, run.y - zone.center.y);
    const zoneWeight = edgeMargin < ZONE_EDGE_METERS ? 4 : 1; // 안전 구역 가장자리에서는 구역으로 돌아가는 것을 우선한다
    let dx = base ? unit(base.dx, base.dy).dx * zoneWeight : 0;
    let dy = base ? unit(base.dx, base.dy).dy * zoneWeight : 0;
    const wanted = wantedItem(run);
    if (wanted) {
      const toItem = unit(wanted.x - run.x, wanted.y - run.y);
      dx += toItem.dx * 1.5;
      dy += toItem.dy * 1.5;
    }
    for (const bomb of run.bombs) {
      const away = unit(run.x - bomb.x, run.y - bomb.y);
      const gap = Math.hypot(run.x - bomb.x, run.y - bomb.y) - bomb.radius;
      if (gap < BOMB_FLEE_MARGIN_METERS) {
        dx += away.dx * 3;
        dy += away.dy * 3;
      }
    }
    for (const chaser of run.chasers) {
      const gap = Math.hypot(run.x - chaser.x, run.y - chaser.y);
      if (gap < CHASER_FLEE_METERS) {
        const away = unit(run.x - chaser.x, run.y - chaser.y);
        dx += away.dx * 1.5;
        dy += away.dy * 1.5;
      }
    }
    return Math.hypot(dx, dy) < 0.01 ? null : { dx, dy };
  };
}

const preview = (run) => {
  const sec = run.tick / TICKS_PER_SECOND;
  const circle = upcomingZoneAt(run.plan, sec)?.circle ?? zoneAt(run.plan, sec);
  return directionToward(run, circle.center);
};

const bots = {
  idle: () => () => null,
  // 예고(10초 전)가 뜨면 다음 안전 원 중심으로, 아니면 현재 원 중심으로 간다. 폭격·추적자는 신경 쓰지 않는다
  previewFollower: () => withSidestep(preview),
  // 위와 같지만 폭격 원과 추적자를 피해 움직인다
  previewDodger: () => withSidestep(withDodging(preview)),
  // 자기장 밖으로 밀려난 뒤에야 현재 원 중심으로 간다
  lateReactor: () => withSidestep((run) => {
    const zone = zoneAt(run.plan, run.tick / TICKS_PER_SECOND);
    return isInsideZone(zone, run.x, run.y) ? null : directionToward(run, zone.center);
  }),
};

for (const [name, makeDecide] of Object.entries(bots)) {
  let cleared = 0;
  let surviveTotal = 0;
  const causes = { zone: 0, bomb: 0, chaser: 0 };
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const run = createRun(seed);
    const decide = makeDecide();
    while (run.status === 'playing') step(run, decide(run));
    if (run.status === 'cleared') cleared += 1;
    else causes[run.deathCause] += 1;
    surviveTotal += run.tick / TICKS_PER_SECOND;
  }
  console.log(name, `clear ${cleared}/${SEEDS}`, `사망 원인 ${JSON.stringify(causes)}`, `평균 생존 ${(surviveTotal / SEEDS).toFixed(1)}초`);
}
