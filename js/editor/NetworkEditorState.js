import { Node, Edge, Lane, Signal, SignalPhase } from '../model/index.js';
import { inferMovement } from './connectionInference.js';

const SIGNAL_REQUIRED_DEGREE = 2; // この本数以上のエッジが接続するノードを交差点(信号必須)とみなす

function extractNumericSuffix(id) {
  const match = /(\d+)$/.exec(id ?? '');
  return match ? parseInt(match[1], 10) : 0;
}

function headingDegrees(fromNode, toNode) {
  return (Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180) / Math.PI;
}

/**
 * 道路網エディタの編集状態。ノード・エッジ・車線・信号のCRUD操作と、
 * それに伴う接続関係(connections)・信号現示の自動再計算を担う。
 * シミュレーション本体(engine)には依存しない。
 */
export class NetworkEditorState {
  constructor(network = { nodes: [], edges: [], lanes: [], signals: [] }) {
    this.nodes = [...network.nodes];
    this.edges = [...network.edges];
    this.lanes = [...network.lanes];
    this.signals = [...network.signals];
    this.selection = null; // { type: 'node' | 'edge', id }

    const allIds = [...this.nodes, ...this.edges, ...this.lanes, ...this.signals].map((o) => o.id);
    this._counter = allIds.reduce((max, id) => Math.max(max, extractNumericSuffix(id)), 0);
  }

  generateId(prefix) {
    this._counter += 1;
    return `${prefix}-${this._counter}`;
  }

  toNetwork() {
    return { nodes: this.nodes, edges: this.edges, lanes: this.lanes, signals: this.signals };
  }

  findNodeNear(x, y, radiusM) {
    let nearest = null;
    let nearestDist = radiusM;
    for (const node of this.nodes) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= nearestDist) {
        nearest = node;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  findEdgeNear(x, y, radiusM) {
    const nodeById = new Map(this.nodes.map((n) => [n.id, n]));
    let nearest = null;
    let nearestDist = radiusM;

    for (const edge of this.edges) {
      const start = nodeById.get(edge.startNodeId);
      const end = nodeById.get(edge.endNodeId);
      if (!start || !end) continue;

      const dist = distanceToSegment(x, y, start.x, start.y, end.x, end.y);
      if (dist <= nearestDist) {
        nearest = edge;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  addNode(x, y) {
    const node = new Node({ id: this.generateId('node'), x, y, elevation: 0, signalId: null });
    this.nodes.push(node);
    return node;
  }

  moveNode(nodeId, x, y) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;

    const affectedNodeIds = new Set([nodeId]);
    for (const edge of this.edges) {
      if (edge.startNodeId === nodeId) affectedNodeIds.add(edge.endNodeId);
      if (edge.endNodeId === nodeId) affectedNodeIds.add(edge.startNodeId);
    }
    for (const id of affectedNodeIds) this.refreshNode(id);
  }

  removeNode(nodeId) {
    const connectedEdges = this.edges.filter((e) => e.startNodeId === nodeId || e.endNodeId === nodeId);
    const affectedNeighborIds = new Set();
    for (const edge of connectedEdges) {
      affectedNeighborIds.add(edge.startNodeId === nodeId ? edge.endNodeId : edge.startNodeId);
      this.removeEdge(edge.id, { skipRefresh: true });
    }

    const node = this.nodes.find((n) => n.id === nodeId);
    if (node?.signalId) {
      this.signals = this.signals.filter((s) => s.id !== node.signalId);
    }
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);

    for (const id of affectedNeighborIds) this.refreshNode(id);
  }

  addEdge(startNodeId, endNodeId, laneCount = 1) {
    const edge = new Edge({
      id: this.generateId('edge'),
      startNodeId,
      endNodeId,
      controlPoints: [],
      laneCount,
      grade: 0,
    });
    this.edges.push(edge);
    this.createLanesForEdge(edge, laneCount);

    this.refreshNode(startNodeId);
    this.refreshNode(endNodeId);
    return edge;
  }

  removeEdge(edgeId, { skipRefresh = false } = {}) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const laneIds = new Set(this.lanes.filter((l) => l.edgeId === edgeId).map((l) => l.id));
    this.lanes = this.lanes.filter((l) => !laneIds.has(l.id));
    for (const lane of this.lanes) {
      lane.connections = lane.connections.filter((c) => !laneIds.has(c.toLaneId));
    }
    this.edges = this.edges.filter((e) => e.id !== edgeId);

    if (!skipRefresh) {
      this.refreshNode(edge.startNodeId);
      this.refreshNode(edge.endNodeId);
    }
  }

  createLanesForEdge(edge, laneCount) {
    for (let i = 0; i < laneCount; i++) {
      this.lanes.push(
        new Lane({
          id: this.generateId('lane'),
          edgeId: edge.id,
          index: i,
          laneChange: { left: i > 0, right: i < laneCount - 1 },
          connections: [],
        })
      );
    }
  }

  setLaneCount(edgeId, newCount) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge || newCount < 1) return;

    const currentLanes = this.lanes
      .filter((l) => l.edgeId === edgeId)
      .sort((a, b) => a.index - b.index);

    if (newCount > currentLanes.length) {
      for (let i = currentLanes.length; i < newCount; i++) {
        this.lanes.push(
          new Lane({ id: this.generateId('lane'), edgeId, index: i, laneChange: { left: true, right: true }, connections: [] })
        );
      }
    } else if (newCount < currentLanes.length) {
      const removedIds = new Set(currentLanes.filter((l) => l.index >= newCount).map((l) => l.id));
      this.lanes = this.lanes.filter((l) => !removedIds.has(l.id));
      for (const lane of this.lanes) {
        lane.connections = lane.connections.filter((c) => !removedIds.has(c.toLaneId));
      }
    }

    edge.laneCount = newCount;

    const updatedLanes = this.lanes.filter((l) => l.edgeId === edgeId).sort((a, b) => a.index - b.index);
    updatedLanes.forEach((lane, i) => {
      lane.laneChange = { left: i > 0, right: i < updatedLanes.length - 1 };
    });

    this.refreshNode(edge.startNodeId);
    this.refreshNode(edge.endNodeId);
  }

  setGrade(edgeId, grade) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (edge) edge.grade = grade;
  }

  /**
   * エッジを3次ベジェ曲線化する(始点・終点を3等分する2点を制御点の初期値とする)。
   * curved=falseの場合は制御点を除去し直線に戻す。
   */
  setEdgeCurved(edgeId, curved) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge) return;

    if (!curved) {
      edge.controlPoints = [];
      return;
    }
    if (edge.controlPoints.length >= 2) return;

    const start = this.nodes.find((n) => n.id === edge.startNodeId);
    const end = this.nodes.find((n) => n.id === edge.endNodeId);
    if (!start || !end) return;

    edge.controlPoints = [
      { x: start.x + (end.x - start.x) / 3, y: start.y + (end.y - start.y) / 3 },
      { x: start.x + ((end.x - start.x) * 2) / 3, y: start.y + ((end.y - start.y) * 2) / 3 },
    ];
  }

  moveControlPoint(edgeId, pointIndex, x, y) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge || !edge.controlPoints[pointIndex]) return;
    edge.controlPoints[pointIndex] = { x, y };
  }

  /**
   * ノードの接続関係(流入車線→流出車線のmovement)と信号現示を再計算する。
   * ノード配置・エッジ接続/削除・車線数変更・ノード移動のたびに呼び出す。
   */
  refreshNode(nodeId) {
    this.recomputeConnections(nodeId);
    this.updateSignal(nodeId);
  }

  recomputeConnections(nodeId) {
    const nodeById = new Map(this.nodes.map((n) => [n.id, n]));
    const node = nodeById.get(nodeId);
    if (!node) return;

    const incoming = [];
    const outgoing = [];

    for (const edge of this.edges) {
      const start = nodeById.get(edge.startNodeId);
      const end = nodeById.get(edge.endNodeId);
      if (!start || !end) continue;
      const heading = headingDegrees(start, end);
      const lanesOfEdge = this.lanes.filter((l) => l.edgeId === edge.id);

      if (edge.endNodeId === nodeId) {
        for (const lane of lanesOfEdge) incoming.push({ lane, edge, heading });
      }
      if (edge.startNodeId === nodeId) {
        for (const lane of lanesOfEdge) outgoing.push({ lane, edge, heading });
      }
    }

    for (const inItem of incoming) {
      const connections = [];
      for (const outItem of outgoing) {
        if (outItem.edge.endNodeId === inItem.edge.startNodeId) continue; // Uターン相当は除外
        const movement = inferMovement(inItem.heading, outItem.heading);
        if (!movement) continue;
        connections.push({ toLaneId: outItem.lane.id, movement });
      }
      inItem.lane.connections = connections;
    }
  }

  updateSignal(nodeId) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const degree = this.edges.filter((e) => e.startNodeId === nodeId || e.endNodeId === nodeId).length;

    const allMovements = [];
    for (const lane of this.lanes) {
      const edge = this.edges.find((e) => e.id === lane.edgeId);
      if (edge && edge.endNodeId === nodeId) {
        for (const conn of lane.connections) {
          allMovements.push({ laneId: lane.id, movement: conn.movement });
        }
      }
    }

    if (degree < SIGNAL_REQUIRED_DEGREE) return;

    let signal = node.signalId ? this.signals.find((s) => s.id === node.signalId) : null;
    if (!signal) {
      signal = new Signal({
        id: this.generateId('signal'),
        nodeId,
        phases: [new SignalPhase({ id: this.generateId('phase'), duration: 30, allowedMovements: [] })],
      });
      this.signals.push(signal);
      node.signalId = signal.id;
    }

    // 単一フェーズ(自動生成の初期状態)の間だけ、接続関係の変化に追随させる。
    // 複数フェーズに手動編集された信号は自動更新の対象から外す。
    if (signal.phases.length === 1) {
      signal.phases[0].allowedMovements = allMovements;
    }
  }
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}
