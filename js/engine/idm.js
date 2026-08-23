const GRAVITY = 9.81;
const DELTA = 4;

/**
 * IDM(Intelligent Driver Model)による加速度を計算する。
 * leaderGap が null の場合は先行車なし(自由走行)として扱う。
 * grade は現在走行中のエッジの固定勾配値[%]。上り(正値)で加速度を減じ、
 * 下り(負値)で加速度を増す。
 */
export function idmAcceleration(vehicle, leaderGap, leaderSpeed, grade = 0) {
  const { desiredSpeed, safeTimeHeadway, maxAcceleration, comfortableDeceleration, minGap } = vehicle.idm;
  const v = vehicle.speed;

  const freeRoadTerm = 1 - Math.pow(v / desiredSpeed, DELTA);

  let interactionTerm = 0;
  if (leaderGap != null) {
    const deltaV = v - leaderSpeed;
    const sStar =
      minGap +
      Math.max(0, v * safeTimeHeadway + (v * deltaV) / (2 * Math.sqrt(maxAcceleration * comfortableDeceleration)));
    interactionTerm = Math.pow(sStar / Math.max(leaderGap, 0.1), 2);
  }

  const acceleration = maxAcceleration * (freeRoadTerm - interactionTerm);
  const gradeCorrection = GRAVITY * Math.sin(Math.atan(grade / 100));

  return acceleration - gradeCorrection;
}
