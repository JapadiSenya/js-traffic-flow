/**
 * 信号フェーズ1つ分。どの車線のどの移動方向(直進/右折/左折)が
 * 青になるかと、その現示時間[秒]を保持する。
 */
export class SignalPhase {
  constructor({ id, duration, allowedMovements = [] }) {
    this.id = id;
    // 現示時間[秒](固定時間制御)
    this.duration = duration;
    // このフェーズで青になる移動 [{ laneId, movement: 'through'|'left'|'right' }]
    this.allowedMovements = allowedMovements;
  }
}

/**
 * ノードに紐づく信号機。フェーズをサイクル順に保持し、
 * 固定時間制御で切り替える。フェーズ切り替えロジックは
 * engine側で信号制御方式を差し替え可能な形に分離する。
 */
export class Signal {
  constructor({ id, nodeId, phases = [] }) {
    this.id = id;
    this.nodeId = nodeId;
    this.phases = phases;
  }
}
