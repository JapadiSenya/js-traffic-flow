/**
 * ノード間の道路区間。ベジェ曲線の制御点は物理座標(メートル単位)で保持する。
 */
export class Edge {
  constructor({ id, startNodeId, endNodeId, controlPoints = [], laneCount = 1, grade = 0 }) {
    this.id = id;
    this.startNodeId = startNodeId;
    this.endNodeId = endNodeId;
    // 3次ベジェの制御点2点 [{x, y}, {x, y}] を想定
    this.controlPoints = controlPoints;
    this.laneCount = laneCount;
    // 固定勾配値[%]。正値が上り、負値が下り。
    this.grade = grade;
  }
}
