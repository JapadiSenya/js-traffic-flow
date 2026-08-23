import { getLaneOffset, laneCenterlinePoints, polylineLength } from '../geometry/index.js';

/**
 * 車線の中心線に沿った物理長[m]を計算する。
 */
export function computeLaneLength(lane, edge, startNode, endNode) {
  const offset = getLaneOffset(lane, edge.laneCount);
  const points = laneCenterlinePoints(startNode, endNode, edge.controlPoints, offset);
  return polylineLength(points);
}

/**
 * ネットワーク内の全車線について長さ[m]を計算し、laneId -> length のMapを返す。
 */
export function buildLaneLengthMap(network) {
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(network.edges.map((e) => [e.id, e]));
  const laneLength = new Map();

  for (const lane of network.lanes) {
    const edge = edgeById.get(lane.edgeId);
    const startNode = nodeById.get(edge.startNodeId);
    const endNode = nodeById.get(edge.endNodeId);
    laneLength.set(lane.id, computeLaneLength(lane, edge, startNode, endNode));
  }

  return laneLength;
}
