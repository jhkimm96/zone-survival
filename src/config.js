// 규칙·수치표의 값을 한곳에 둔다. 밸런스 수정은 이 파일만 바꾸고, 바꿀 때마다 version을 올린다.
// 길이는 미터, 시간은 초 단위다.
export const CONFIG = {
  version: 'v0.6',
  worldSize: 200,
  runSeconds: 180,
  ticksPerSecond: 30,
  startInsetMeters: 5,
  startHp: 100,
  maxHp: 100,
  playerRadius: 0.6,
  moveMetersPerSec: 6,
  warnOutlineSecBefore: 10,
  warnBlinkSecBefore: 5,
  initialZoneRadius: 142, // 월드 모서리까지(약 141.4m)를 덮는 시작 원
  finalCenterMargin: 60, // 최종 원 중심이 월드 가장자리에서 떨어져야 하는 거리
  zoneStages: [
    { startSec: 30, shrinkSec: 20, radius: 90, damagePerSec: 5 },
    { startSec: 70, shrinkSec: 20, radius: 50, damagePerSec: 8 },
    { startSec: 110, shrinkSec: 20, radius: 20, damagePerSec: 12 },
  ],
  obstacles: {
    count: 40,
    minRadius: 1.5,
    maxRadius: 3,
    clearRadiusAroundStart: 10,
  },
  items: {
    spawnEverySec: 6,
    maxOnMap: 8,
    lifetimeSec: 45,
    pickupRadius: 2,
    minGapBetweenItems: 3,
    obstacleClearance: 1,
    heal: { amount: 25 },
    haste: { durationSec: 8, speedMultiplier: 1.5 },
    shield: { durationSec: 5 },
  },
  bombs: {
    firstSec: 20,
    everySec: 8,
    warningSec: 2.5,
    radius: 6,
    damage: 35,
    aimRadius: 14, // 플레이어 주변 이 거리 안에 떨어진다
    salvoSizeByStage: [2, 3, 4, 5], // 자기장 단계 0~3
  },
  chasers: {
    firstSec: 40,
    everySec: 12,
    maxAlive: 6,
    lifetimeSec: 45,
    speedMetersPerSec: 4.5,
    radius: 0.8,
    contactRadius: 1.5,
    damagePerSec: 20,
    spawnDistance: 35,
  },
  view: { sizeMeters: 40, minimapPixels: 90 },
  // 공개용(publishable) 키라 브라우저 코드에 있어도 된다. 권한은 supabase/schema.sql의 RLS가 insert만 허용한다.
  remote: {
    url: 'https://whravwfxqhvjkaqqgggc.supabase.co',
    publishableKey: 'sb_publishable_c3VLwmb21k30wFMqEp7vEA_b7nkwyfq',
  },
};
