const MAX_SEED = 2_000_000_000; // DB의 int 칸에 들어가는 범위 안

// ?seed=N(1 이상의 정수)이 주소에 있으면 N, N+1, N+2 순서로 같은 조건을 재현하고,
// 아니면 판마다 무작위로 뽑는다. 같은 지도를 외워서 쉬워지는 것을 막기 위해 기본은 무작위다.
export function pickRunSeed(params, runNumber, random = Math.random) {
  const fixedBase = Number(params.get('seed'));
  if (Number.isInteger(fixedBase) && fixedBase >= 1) return fixedBase + runNumber - 1;
  return 1 + Math.floor(random() * MAX_SEED);
}
