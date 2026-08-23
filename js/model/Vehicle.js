/**
 * 車両。IDM/MOBILパラメータは個体差を持たせるため、
 * 設定ファイルのデフォルト値からの調整分を各車両インスタンスに保持する。
 */
export class Vehicle {
  constructor({
    id,
    laneId,
    s = 0, // レーン起点からの距離[m]
    speed = 0, // [m/s]
    length = 4.5, // 車両長[m]
    idm = {
      desiredSpeed: 15, // 希望速度[m/s]
      safeTimeHeadway: 1.5, // 安全車間時間[s]
      maxAcceleration: 1.5, // 最大加速度[m/s^2]
      comfortableDeceleration: 2.0, // 快適減速度[m/s^2]
      minGap: 2.0, // 静止時の最小車間距離[m]
    },
    mobil = {
      politeness: 0.3, // 政治的パラメータ(politeness factor)
      changeThreshold: 0.2, // 車線変更を実行する加速度改善の閾値[m/s^2]
      safeBraking: 4.0, // 安全基準となる最大減速度[m/s^2]
    },
    reactionInterval = 0.3, // 加速度再計算の更新間隔[s](個体差あり)
  } = {}) {
    this.id = id;
    this.laneId = laneId;
    this.s = s;
    this.speed = speed;
    this.length = length;
    this.idm = idm;
    this.mobil = mobil;
    this.reactionInterval = reactionInterval;

    // 直前に計算した加速度。次回更新タイミングまで維持する(反応遅延の表現)。
    this.acceleration = 0;
    // 次回加速度再計算を行うシミュレーション時刻[s]
    this.nextUpdateTime = 0;
  }
}
