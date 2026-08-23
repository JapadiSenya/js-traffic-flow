const MERGE_ANGLE_THRESHOLD = 45; // [deg] このしきい値以内の進行方向差は直進とみなす

function normalizeDegrees(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * 流入方向・流出方向の進行角[deg](atan2(dy,dx)*180/PI)から、
 * 交差点での移動区分(直進/左折/右折)を推定する。
 * 後方(Uターン相当)への接続はnullを返す。
 */
export function inferMovement(inHeadingDeg, outHeadingDeg) {
  const diff = normalizeDegrees(outHeadingDeg - inHeadingDeg);

  if (Math.abs(diff) <= MERGE_ANGLE_THRESHOLD) return 'through';
  if (diff < -MERGE_ANGLE_THRESHOLD && diff > -(180 - MERGE_ANGLE_THRESHOLD)) return 'left';
  if (diff > MERGE_ANGLE_THRESHOLD && diff < 180 - MERGE_ANGLE_THRESHOLD) return 'right';
  return null;
}
