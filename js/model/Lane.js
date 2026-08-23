/**
 * エッジ内の個々の車線。
 */
export class Lane {
  constructor({
    id,
    edgeId,
    index,
    laneChange = { left: true, right: true },
    connections = [],
  }) {
    this.id = id;
    this.edgeId = edgeId;
    // エッジ内での車線番号(0始まり)
    this.index = index;
    // 隣接車線への車線変更可否
    this.laneChange = laneChange;
    // 交差点通過後に接続する車線。合流/分岐もこの接続関係で表現する。
    // 例: [{ toLaneId: 'lane-2', movement: 'through' | 'left' | 'right' }]
    this.connections = connections;
  }
}
