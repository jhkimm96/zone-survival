import { CONFIG } from './config.js';
import { createRng } from './rng.js';

const MAX_PLAN_ATTEMPTS = 1000;

function randomPointInDisk(rng, center, radius) {
  const angle = rng() * 2 * Math.PI;
  const distance = Math.sqrt(rng()) * radius; // sqrt로 원판 전체에 고르게 퍼뜨린다
  return { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
}

// 시작 원 안에서 단계 원을 차례로 정한다. 각 원은 직전 원 안에 완전히 들어가므로 영역은 줄어들기만 한다.
// 최종 원 중심이 월드 가장자리에 너무 가까우면 처음부터 다시 뽑는다.
export function planZones(seed, config = CONFIG) {
  const rng = createRng(seed);
  const mapCenter = { x: config.worldSize / 2, y: config.worldSize / 2 };
  const initial = { center: mapCenter, radius: config.initialZoneRadius };
  const margin = config.finalCenterMargin;

  for (let attempt = 0; attempt < MAX_PLAN_ATTEMPTS; attempt += 1) {
    let previous = initial;
    const stages = config.zoneStages.map((rule) => {
      const center = randomPointInDisk(rng, previous.center, previous.radius - rule.radius);
      const circle = { center, radius: rule.radius };
      previous = circle;
      return { ...rule, circle };
    });
    const finalCenter = stages.at(-1).circle.center;
    const farFromEdge = [finalCenter.x, finalCenter.y].every((value) => value >= margin && value <= config.worldSize - margin);
    if (farFromEdge) return { initial, stages };
  }
  throw new Error(`자기장 계획을 만들지 못했다 (seed ${seed})`);
}

// 0 = 아직 자기장 없음, 1~3 = 해당 단계 진행 중
export function stageIndexAt(plan, sec) {
  return plan.stages.filter((stage) => stage.startSec <= sec).length;
}

// 그 시각의 안전 원. 단계가 시작되면 shrinkSec 동안 이전 원에서 목표 원으로 선형으로 줄어든다.
export function zoneAt(plan, sec) {
  const stageIndex = stageIndexAt(plan, sec);
  if (stageIndex === 0) return { center: plan.initial.center, radius: plan.initial.radius, shrinking: false, target: null };
  const stage = plan.stages[stageIndex - 1];
  const from = stageIndex === 1 ? plan.initial : plan.stages[stageIndex - 2].circle;
  const progress = Math.min(1, (sec - stage.startSec) / stage.shrinkSec);
  const lerp = (start, end) => start + (end - start) * progress;
  return {
    center: { x: lerp(from.center.x, stage.circle.center.x), y: lerp(from.center.y, stage.circle.center.y) },
    radius: lerp(from.radius, stage.circle.radius),
    shrinking: progress < 1,
    target: progress < 1 ? stage.circle : null,
  };
}

export function damagePerSecondAt(plan, sec) {
  const stageIndex = stageIndexAt(plan, sec);
  return stageIndex === 0 ? 0 : plan.stages[stageIndex - 1].damagePerSec;
}

export function isInsideZone(circle, x, y) {
  return Math.hypot(x - circle.center.x, y - circle.center.y) <= circle.radius;
}

// 다음 단계 시작 전 예고 구간이면 다음 목표 원과 남은 시간을 돌려준다. 깜빡임은 마지막 5초.
export function upcomingZoneAt(plan, sec, config = CONFIG) {
  const next = plan.stages[stageIndexAt(plan, sec)];
  if (!next) return null;
  const secUntil = next.startSec - sec;
  if (secUntil > config.warnOutlineSecBefore) return null;
  return { circle: next.circle, secUntil, blinking: secUntil <= config.warnBlinkSecBefore };
}

// 최종 원까지 가장 오래 걸어야 하는 모서리 안쪽에서 시작한다. 거리가 같으면 목록 앞쪽 모서리(결정적이어야 시드 비교가 된다).
export function startPositionFor(plan, config = CONFIG) {
  const near = config.startInsetMeters;
  const far = config.worldSize - near;
  const corners = [{ x: near, y: near }, { x: far, y: near }, { x: near, y: far }, { x: far, y: far }];
  const finalCenter = plan.stages.at(-1).circle.center;
  const distanceToFinal = (corner) => Math.hypot(corner.x - finalCenter.x, corner.y - finalCenter.y);
  return corners.reduce((farthest, corner) => (distanceToFinal(corner) > distanceToFinal(farthest) ? corner : farthest));
}
