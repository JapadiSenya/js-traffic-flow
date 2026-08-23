const MARGIN = { top: 16, right: 16, bottom: 32, left: 56 };

/**
 * 時空間図(トラジェクトリダイアグラム)を描画する。
 * 横軸: 時刻[s]、縦軸: 経路始点からの累積距離[m]。
 * 汎用グラフライブラリは使わず、Canvas 2D APIで自前描画する。
 */
export function drawDiagram(ctx, trajectories, timeRange, distanceRange) {
  const { width, height } = ctx.canvas;
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  const [tMin, tMax] = timeRange;
  const [dMin, dMax] = distanceRange;
  const tSpan = tMax - tMin || 1;
  const dSpan = dMax - dMin || 1;

  function toScreen(t, distance) {
    return {
      x: MARGIN.left + ((t - tMin) / tSpan) * plotWidth,
      y: MARGIN.top + plotHeight - ((distance - dMin) / dSpan) * plotHeight,
    };
  }

  ctx.save();
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, height);

  // 軸線
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, MARGIN.top);
  ctx.lineTo(MARGIN.left, MARGIN.top + plotHeight);
  ctx.lineTo(MARGIN.left + plotWidth, MARGIN.top + plotHeight);
  ctx.stroke();

  // 軸目盛りラベル(5分割)
  ctx.fillStyle = '#ccc';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 5; i++) {
    const t = tMin + (tSpan * i) / 5;
    const { x } = toScreen(t, dMin);
    ctx.fillText(`${t.toFixed(0)}s`, x, MARGIN.top + plotHeight + 6);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const d = dMin + (dSpan * i) / 5;
    const { y } = toScreen(tMin, d);
    ctx.fillText(`${d.toFixed(0)}m`, MARGIN.left - 6, y);
  }

  // 各車両の軌跡
  ctx.strokeStyle = '#4ea1ff';
  ctx.lineWidth = 1.2;
  for (const points of trajectories.values()) {
    if (points.length < 2) continue;
    ctx.beginPath();
    points.forEach((p, i) => {
      const s = toScreen(p.t, p.distance);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
  }

  ctx.restore();
}
