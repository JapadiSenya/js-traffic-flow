import { getLaneOffset, laneCenterlinePoints } from './geometry.js';

/**
 * 道路網(ノード・エッジ・車線・信号)をCanvasに俯瞰描画する。
 */
export function drawNetwork(ctx, camera, network) {
  const { nodes, edges, lanes } = network;
  const { width, height } = ctx.canvas;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((e) => [e.id, e]));

  ctx.save();

  ctx.strokeStyle = '#666';
  ctx.lineWidth = Math.max(1, 3 * camera.scale);
  ctx.lineCap = 'round';

  for (const lane of lanes) {
    const edge = edgeById.get(lane.edgeId);
    if (!edge) continue;
    const startNode = nodeById.get(edge.startNodeId);
    const endNode = nodeById.get(edge.endNodeId);
    if (!startNode || !endNode) continue;

    const offset = getLaneOffset(lane, edge.laneCount);
    const points = laneCenterlinePoints(startNode, endNode, edge.controlPoints, offset);

    ctx.beginPath();
    points.forEach((p, i) => {
      const s = camera.worldToScreen(p.x, p.y, width, height);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
  }

  for (const node of nodes) {
    const s = camera.worldToScreen(node.x, node.y, width, height);
    const r = node.signalId ? 6 : 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = node.signalId ? '#e0b04c' : '#999';
    ctx.fill();
  }

  ctx.restore();
}
