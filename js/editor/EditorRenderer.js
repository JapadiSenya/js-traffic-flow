import { getLaneOffset, laneCenterlinePoints } from '../geometry/index.js';

const HIGHLIGHT_COLOR = '#ffd54f';
const ROUTE_COLOR = '#7fffd4';

/**
 * 現在選択中のノード/エッジをハイライト表示する。
 */
export function drawSelectionHighlight(ctx, camera, network, selection) {
  if (!selection) return;
  const { width, height } = ctx.canvas;

  ctx.save();

  if (selection.type === 'node') {
    const node = network.nodes.find((n) => n.id === selection.id);
    if (node) {
      const screen = camera.worldToScreen(node.x, node.y, width, height);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = HIGHLIGHT_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (selection.type === 'edge') {
    const edge = network.edges.find((e) => e.id === selection.id);
    const nodeById = new Map(network.nodes.map((n) => [n.id, n]));
    const start = edge && nodeById.get(edge.startNodeId);
    const end = edge && nodeById.get(edge.endNodeId);

    if (start && end) {
      const points = laneCenterlinePoints(start, end, edge.controlPoints, 0);
      ctx.beginPath();
      points.forEach((p, i) => {
        const s = camera.worldToScreen(p.x, p.y, width, height);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.strokeStyle = HIGHLIGHT_COLOR;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (edge.controlPoints.length >= 2) {
        ctx.fillStyle = HIGHLIGHT_COLOR;
        for (const cp of edge.controlPoints) {
          const s = camera.worldToScreen(cp.x, cp.y, width, height);
          ctx.beginPath();
          ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

/**
 * 時空間図用に選択中の経路(レーンIDのシーケンス)を、選択順の番号付きでハイライト表示する。
 */
export function drawRouteHighlight(ctx, camera, network, routeLaneIds) {
  if (!routeLaneIds || routeLaneIds.length === 0) return;
  const { width, height } = ctx.canvas;
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(network.edges.map((e) => [e.id, e]));
  const laneById = new Map(network.lanes.map((l) => [l.id, l]));

  ctx.save();
  ctx.strokeStyle = ROUTE_COLOR;
  ctx.fillStyle = ROUTE_COLOR;
  ctx.lineWidth = 3;
  ctx.font = 'bold 12px system-ui, sans-serif';

  routeLaneIds.forEach((laneId, index) => {
    const lane = laneById.get(laneId);
    const edge = lane && edgeById.get(lane.edgeId);
    const start = edge && nodeById.get(edge.startNodeId);
    const end = edge && nodeById.get(edge.endNodeId);
    if (!start || !end) return;

    const offset = getLaneOffset(lane, edge.laneCount);
    const points = laneCenterlinePoints(start, end, edge.controlPoints, offset);

    ctx.beginPath();
    points.forEach((p, i) => {
      const s = camera.worldToScreen(p.x, p.y, width, height);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();

    const mid = points[Math.floor(points.length / 2)];
    const screenMid = camera.worldToScreen(mid.x, mid.y, width, height);
    ctx.fillText(String(index + 1), screenMid.x + 6, screenMid.y - 6);
  });

  ctx.restore();
}
