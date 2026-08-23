/**
 * 交差点ノード。座標は物理座標(メートル単位)で保持する。
 */
export class Node {
  constructor({ id, x, y, elevation = 0, signalId = null }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.elevation = elevation;
    this.signalId = signalId;
  }
}
