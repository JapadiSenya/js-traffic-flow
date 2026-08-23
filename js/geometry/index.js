/**
 * 道路網の幾何計算(ベジェ曲線・車線オフセット・弧長)を提供する共通ユーティリティ。
 * renderer(描画)・engine(車線長の判定)・diagram(累積距離の算出)から共通で利用する。
 */

/**
 * 3次ベジェ曲線上の点を計算する。
 */
export function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function normal(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

/**
 * エッジ中心線に対する車線の法線方向オフセット[m]を返す。
 * 車線番号(index)が大きいほど、始点→終点方向を向いて右側に並ぶ。
 */
export function getLaneOffset(lane, laneCount, laneWidth = 3.5) {
  return (lane.index - (laneCount - 1) / 2) * laneWidth;
}

/**
 * 車線の中心線を物理座標の点列として返す。
 * ベジェ制御点が無い場合は始点・終点を結ぶ直線として扱う。
 * オフセットは始点→終点を結ぶ直線の法線方向で近似する(将来、曲線に沿った
 * 正確なパラレルカーブが必要になれば置き換え可能な形にしてある)。
 */
export function laneCenterlinePoints(startNode, endNode, controlPoints, offset, segments = 24) {
  const n = normal(endNode.x - startNode.x, endNode.y - startNode.y);
  const ox = n.x * offset;
  const oy = n.y * offset;

  const p0 = { x: startNode.x + ox, y: startNode.y + oy };
  const p3 = { x: endNode.x + ox, y: endNode.y + oy };

  if (!controlPoints || controlPoints.length < 2) {
    return [p0, p3];
  }

  const p1 = { x: controlPoints[0].x + ox, y: controlPoints[0].y + oy };
  const p2 = { x: controlPoints[1].x + ox, y: controlPoints[1].y + oy };

  const points = [];
  for (let i = 0; i <= segments; i++) {
    points.push(cubicBezierPoint(p0, p1, p2, p3, i / segments));
  }
  return points;
}

/**
 * 点列(ポリライン近似)の弧長を返す。
 */
export function polylineLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}
