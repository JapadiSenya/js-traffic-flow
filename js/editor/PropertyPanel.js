import { SignalPhase } from '../model/index.js';

const MOVEMENT_LABEL = { through: '直進', left: '左折', right: '右折' };

/**
 * 選択中のノード/エッジの詳細を表示・編集するサイドパネル。
 * ノードに信号がある場合は、フェーズごとの現示(右左折矢印を含む)をGUIで編集できる。
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

  getIncomingLanes(nodeId) {
    const result = [];
    for (const lane of this.state.lanes) {
      const edge = this.state.edges.find((e) => e.id === lane.edgeId);
      if (!edge || edge.endNodeId !== nodeId) continue;
      const movements = [...new Set(lane.connections.map((c) => c.movement))];
      if (movements.length > 0) result.push({ lane, movements });
    }
    return result;
  }

  renderNodePanel(nodeId) {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const signal = node.signalId ? this.state.signals.find((s) => s.id === node.signalId) : null;

    this.container.innerHTML = `
      <h3>ノード</h3>
      <p>ID: ${node.id}</p>
      <p>座標: (${node.x.toFixed(1)}, ${node.y.toFixed(1)}) m</p>
      <label>標高[m]<input id="prop-elevation" type="number" step="0.5" value="${node.elevation}"></label>
      ${signal ? this.renderSignalHtml(signal, nodeId) : '<p>信号: なし(エッジが2本以上接続すると自動生成されます)</p>'}
    `;

    this.container.querySelector('#prop-elevation').addEventListener('change', (e) => {
      node.elevation = Number(e.target.value) || 0;
      this.onChange?.();
    });

    if (signal) this.attachSignalHandlers(signal, nodeId);
  }

  renderSignalHtml(signal, nodeId) {
    const incomingLanes = this.getIncomingLanes(nodeId);
    const phasesHtml = signal.phases.map((phase, i) => this.renderPhaseHtml(phase, i, incomingLanes)).join('');

    return `
      <h3>信号フェーズ</h3>
      <div id="signal-phases">${phasesHtml}</div>
      <div class="signal-actions">
        <button id="phase-add-btn" type="button">フェーズ追加</button>
        <button id="signal-reset-btn" type="button">自動生成に戻す</button>
      </div>
    `;
  }

  renderPhaseHtml(phase, phaseIndex, incomingLanes) {
    const laneRows = incomingLanes
      .map(({ lane, movements }) => {
        const checkboxes = movements
          .map((m) => {
            const checked = phase.allowedMovements.some((am) => am.laneId === lane.id && am.movement === m);
            return `<label class="inline"><input type="checkbox" class="phase-movement" data-phase="${phaseIndex}" data-lane="${lane.id}" data-movement="${m}" ${checked ? 'checked' : ''}>${MOVEMENT_LABEL[m]}</label>`;
          })
          .join('');
        return `<div class="phase-lane-row"><span>${lane.id}</span><div class="phase-movement-checks">${checkboxes}</div></div>`;
      })
      .join('');

    return `
      <div class="phase-block">
        <div class="phase-header">
          <span>フェーズ${phaseIndex + 1}</span>
          <label>時間[s]<input type="number" class="phase-duration" data-phase="${phaseIndex}" value="${phase.duration}" min="1" step="1"></label>
          <button type="button" class="phase-delete-btn" data-phase="${phaseIndex}">削除</button>
        </div>
        ${laneRows || '<p class="phase-empty">流入車線がありません</p>'}
      </div>
    `;
  }

  attachSignalHandlers(signal, nodeId) {
    this.container.querySelectorAll('.phase-duration').forEach((input) => {
      input.addEventListener('change', (e) => {
        const phaseIndex = Number(e.target.dataset.phase);
        signal.phases[phaseIndex].duration = Math.max(1, Number(e.target.value) || 1);
        this.onChange?.();
      });
    });

    this.container.querySelectorAll('.phase-movement').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const phaseIndex = Number(e.target.dataset.phase);
        const laneId = e.target.dataset.lane;
        const movement = e.target.dataset.movement;
        const phase = signal.phases[phaseIndex];
        const idx = phase.allowedMovements.findIndex((am) => am.laneId === laneId && am.movement === movement);
        if (e.target.checked && idx === -1) {
          phase.allowedMovements.push({ laneId, movement });
        } else if (!e.target.checked && idx !== -1) {
          phase.allowedMovements.splice(idx, 1);
        }
        this.onChange?.();
      });
    });

    this.container.querySelectorAll('.phase-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (signal.phases.length <= 1) return;
        const phaseIndex = Number(e.target.dataset.phase);
        signal.phases.splice(phaseIndex, 1);
        this.render();
        this.onChange?.();
      });
    });

    const addBtn = this.container.querySelector('#phase-add-btn');
    addBtn?.addEventListener('click', () => {
      signal.phases.push(new SignalPhase({ id: this.state.generateId('phase'), duration: 30, allowedMovements: [] }));
      this.render();
      this.onChange?.();
    });

    const resetBtn = this.container.querySelector('#signal-reset-btn');
    resetBtn?.addEventListener('click', () => {
      signal.phases = [new SignalPhase({ id: this.state.generateId('phase'), duration: 30, allowedMovements: [] })];
      this.state.updateSignal(nodeId);
      this.render();
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
