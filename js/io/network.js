import { Node, Edge, Lane, Signal, SignalPhase } from '../model/index.js';

/**
 * 道路網ファイル(JSON互換オブジェクト)をモデルインスタンス群に変換する。
 */
export function deserializeNetwork(json) {
  const nodes = (json.nodes ?? []).map((n) => new Node(n));
  const edges = (json.edges ?? []).map((e) => new Edge(e));
  const lanes = (json.lanes ?? []).map((l) => new Lane(l));
  const signals = (json.signals ?? []).map(
    (s) =>
      new Signal({
        ...s,
        phases: (s.phases ?? []).map((p) => new SignalPhase(p)),
      })
  );
  return { nodes, edges, lanes, signals };
}

/**
 * モデルインスタンス群を道路網ファイル(JSON互換オブジェクト)に変換する。
 */
export function serializeNetwork({ nodes, edges, lanes, signals }) {
  return {
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
    lanes: lanes.map((l) => ({ ...l })),
    signals: signals.map((s) => ({
      ...s,
      phases: s.phases.map((p) => ({ ...p })),
    })),
  };
}
