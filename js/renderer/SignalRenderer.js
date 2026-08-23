import { getLaneOffset, laneCenterlinePoints } from '../geometry/index.js';

/**
 * 各車線の停止線位置に、直進movementの許可状態を色で示すマーカーを描画する。
 * signalControllers は nodeId -> { isMovementAllowed(laneId, movement) } のMap。
 */
export function drawSignalStates(ctx, camera, network, signalControllers) {
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(network.edges.map((e) => [e.id, e]));
  const { width, height } = ctx.canvas;

  ctx.save();

  for (const lane of network.lanes) {
    if (lane.connections.length === 0) continue;

    const edge = edgeById.get(lane.edgeId);
    const controller = signalControllers.get(edge.endNodeId);
    if (!controller) continue;

    const startNode = nodeById.get(edge.startNodeId);
    const endNode = nodeById.get(edge.endNodeId);
    const offset = getLaneOffset(lane, edge.laneCount);
    const points = laneCenterlinePoints(startNode, endNode, edge.controlPoints, offset);
    const stopLine = points[points.length - 1];

    const allowed = controller.isMovementAllowed(lane.id, 'through');
    const screen = camera.worldToScreen(stopLine.x, stopLine.y, width, height);

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = allowed ? '#4caf50' : '#e05252';
    ctx.fill();
  }

  ctx.restore();
}
