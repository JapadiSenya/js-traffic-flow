/**
 * MOBIL(Minimizing Overall Braking Induced by Lane changes)による
 * 車線変更の可否判定。呼び出し側が各シナリオでのIDM加速度を計算し、
 * その結果を渡すことで判定のみを担う純粋関数として分離している。
 *
 * @param {number} currentAccel 現在車線に留まった場合の自車加速度
 * @param {number} newLaneAccel 変更後車線に移った場合の自車加速度
 * @param {number} newFollowerAccelBefore 変更前、変更後車線の後続車の加速度
 * @param {number} newFollowerAccelAfter 変更後、変更後車線の後続車の加速度(自車が割り込んだ後)
 * @param {number} oldFollowerAccelBefore 変更前、現在車線の後続車の加速度
 * @param {number} oldFollowerAccelAfter 変更後、現在車線の後続車の加速度(自車がいなくなった後)
 * @param {{ politeness: number, changeThreshold: number, safeBraking: number }} mobilParams
 */
export function mobilDecision({
  currentAccel,
  newLaneAccel,
  newFollowerAccelBefore,
  newFollowerAccelAfter,
  oldFollowerAccelBefore,
  oldFollowerAccelAfter,
  mobilParams,
}) {
  const { politeness, changeThreshold, safeBraking } = mobilParams;

  // 安全基準: 変更後の新しい後続車が過度な急減速を強いられないこと
  if (newFollowerAccelAfter < -safeBraking) {
    return false;
  }

  // インセンティブ基準: 自車の加速度改善が、周囲車両への影響(politeness込み)を上回ること
  const incentive =
    newLaneAccel -
    currentAccel +
    politeness * (newFollowerAccelAfter - newFollowerAccelBefore + (oldFollowerAccelAfter - oldFollowerAccelBefore));

  return incentive > changeThreshold;
}
