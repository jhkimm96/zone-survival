// 모든 피해(자기장, 폭격, 추적자)는 여기를 거친다. 보호 효과는 출처와 상관없이 피해를 막는다.
export function takeDamage(run, source, amount) {
  const shielded = run.tick < run.shieldUntilTick;
  if (shielded) return;
  run.hp -= amount;
  run.damageTaken[source] += amount;
  run.lastDamageSource = source;
}
