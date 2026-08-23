/**
 * エッジ起点の継続的な流入を、交通量[台/時]から生成間隔を
 * 指数分布でサンプリングするポアソン過程として表現する。
 */
export class InflowSpawner {
  constructor({ edgeId, flowRate }, rng = Math.random) {
    this.edgeId = edgeId;
    this.flowRate = flowRate;
    this.rng = rng;
    this.elapsed = 0;
    this.nextInterval = this.sampleInterval();
  }

  sampleInterval() {
    if (this.flowRate <= 0) return Infinity;
    const meanInterval = 3600 / this.flowRate;
    return -meanInterval * Math.log(1 - this.rng());
  }

  /**
   * dt秒進める。このステップで車両をスポーンすべきならtrueを返す。
   */
  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.nextInterval) {
      this.elapsed -= this.nextInterval;
      this.nextInterval = this.sampleInterval();
      return true;
    }
    return false;
  }
}
