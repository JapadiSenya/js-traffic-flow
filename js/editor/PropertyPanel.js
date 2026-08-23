/**
 * 選択中のノード/エッジの詳細を表示・編集するサイドパネル。
 */
export class PropertyPanel {
  constructor({ container, state, onChange }) {
    this.container = container;
    this.state = state;
    this.onChange = onChange;
  }

  render() {
    const selection = this.state.selection;

    if (!selection) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
      return;
    }
    this.container.classList.remove('hidden');

    if (selection.type === 'node') {
      this.renderNodePanel(selection.id);
    } else if (selection.type === 'edge') {
      this.renderEdgePanel(selection.id);
    }
  }

  renderNodePanel(nodeId) {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.container.innerHTML = `
      <h3>ノード</h3>
      <p>ID: ${node.id}</p>
      <p>座標: (${node.x.toFixed(1)}, ${node.y.toFixed(1)}) m</p>
      <label>標高[m]<input id="prop-elevation" type="number" step="0.5" value="${node.elevation}"></label>
      <p>${node.signalId ? '信号: 自動生成済み' : '信号: なし(エッジが2本以上接続すると自動生成されます)'}</p>
    `;

    this.container.querySelector('#prop-elevation').addEventListener('change', (e) => {
      node.elevation = Number(e.target.value) || 0;
      this.onChange?.();
    });
  }

  renderEdgePanel(edgeId) {
    const edge = this.state.edges.find((e) => e.id === edgeId);
    if (!edge) return;

    this.container.innerHTML = `
      <h3>エッジ</h3>
      <p>ID: ${edge.id}</p>
      <label>車線数<input id="prop-lane-count" type="number" min="1" max="4" value="${edge.laneCount}"></label>
      <label>勾配[%]<input id="prop-grade" type="number" step="0.5" value="${edge.grade}"></label>
    `;

    this.container.querySelector('#prop-lane-count').addEventListener('change', (e) => {
      const value = Math.max(1, Math.min(4, Number(e.target.value) || 1));
      e.target.value = String(value);
      this.state.setLaneCount(edge.id, value);
      this.onChange?.();
    });

    this.container.querySelector('#prop-grade').addEventListener('change', (e) => {
      this.state.setGrade(edge.id, Number(e.target.value) || 0);
      this.onChange?.();
    });
  }
}
