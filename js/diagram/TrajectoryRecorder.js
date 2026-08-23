/**
 * 経路(レーンIDのシーケンス)上の各車両について、
 * 経路始点からの累積距離(曲線区間は弧長換算)を時刻とともに記録する。
 * 一定時間シミュレーションを実行した後、まとめて時空間図として描画する用途に使う
 * (リアルタイム更新は行わない)。
 */
export class TrajectoryRecorder {
  constructor(routeLaneIds, laneLengthMap) {
    this.routeLaneIds = routeLaneIds;
    this.routeLaneSet = new Set(routeLaneIds);
    this.offsets = new Map();

    let cumulative = 0;
    for (const laneId of routeLaneIds) {
      this.offsets.set(laneId, cumulative);
      cumulative += laneLengthMap.get(laneId) ?? 0;
    }
    this.totalDistance = cumulative;

    this.trajectories = new Map(); // vehicleId -> [{ t, distance }]
  }

  /**
   * 現時点の全車両を1サンプルとして記録する。経路上にいない車両は無視する。
   */
  record(time, vehicles) {
    for (const vehicle of vehicles) {
      if (!this.routeLaneSet.has(vehicle.laneId)) continue;

      const distance = this.offsets.get(vehicle.laneId) + vehicle.s;
      if (!this.trajectories.has(vehicle.id)) {
        this.trajectories.set(vehicle.id, []);
      }
      this.trajectories.get(vehicle.id).push({ t: time, distance });
    }
  }
}
