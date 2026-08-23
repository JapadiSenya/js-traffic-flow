/**
 * 分岐(交差点)における進路のランダム選択。
 * OD設定や経路指定は行わず、接続先候補から毎回ランダムに1つを選ぶ。
 * connectionsが空(ネットワークの出口)の場合はnullを返す。
 */
export function chooseNextConnection(lane, rng = Math.random) {
  const { connections } = lane;
  if (!connections || connections.length === 0) return null;
  const index = Math.floor(rng() * connections.length);
  return connections[index];
}
