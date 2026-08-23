import { laneCenterlinePoints } from '../geometry/index.js';

const HIGHLIGHT_COLOR = '#ffd54f';

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
    }
  }

  ctx.restore();
}
