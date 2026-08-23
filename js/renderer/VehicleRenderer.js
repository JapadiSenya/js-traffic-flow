import { getLaneOffset, laneCenterlinePoints, pointAtDistance } from '../geometry/index.js';

const VEHICLE_WIDTH = 2; // [m] モデルには幅を持たせていないため描画上の固定値とする
const HEADING_LOOKAHEAD = 0.5; // 進行方向を求めるための前方参照距離[m]

/**
 * 車両群をCanvasに描画する。vehiclesは Vehicle インスタンスのIterableを受け取る。
 */
export function drawVehicles(ctx, camera, network, vehicles) {
  const { width, height } = ctx.canvas;
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(network.edges.map((e) => [e.id, e]));
  const laneById = new Map(network.lanes.map((l) => [l.id, l]));

  ctx.save();
  ctx.fillStyle = '#4ea1ff';

  for (const vehicle of vehicles) {
    const lane = laneById.get(vehicle.laneId);
    if (!lane) continue;
    const edge = edgeById.get(lane.edgeId);
    const startNode = nodeById.get(edge.startNodeId);
    const endNode = nodeById.get(edge.endNodeId);

    const offset = getLaneOffset(lane, edge.laneCount);
    const points = laneCenterlinePoints(startNode, endNode, edge.controlPoints, offset);

    const pos = pointAtDistance(points, vehicle.s);
    const ahead = pointAtDistance(points, vehicle.s + HEADING_LOOKAHEAD);
    const angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);

    const screen = camera.worldToScreen(pos.x, pos.y, width, height);
    const lengthPx = vehicle.length * camera.scale;
    const widthPx = VEHICLE_WIDTH * camera.scale;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(angle);
    ctx.fillRect(-lengthPx / 2, -widthPx / 2, lengthPx, widthPx);
    ctx.restore();
  }

  ctx.restore();
}
