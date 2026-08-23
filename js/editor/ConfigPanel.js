import { serializeConfig, deserializeConfig, downloadJson, readJsonFile } from '../io/index.js';

/**
 * IDM/MOBILデフォルトパラメータ・流入設定・車両初期配置を編集するオーバーレイパネル。
 * 設定ファイル(JSON)のexport/importとも連動する。
 */
export class ConfigPanel {
  constructor({ overlay, panelContainer, getNetwork, getConfig, onApply }) {
    this.overlay = overlay;
    this.container = panelContainer;
    this.getNetwork = getNetwork;
    this.getConfig = getConfig;
    this.onApply = onApply;
    this.pendingInitialVehicles = [];
  }

  open() {
    this.pendingInitialVehicles = this.getConfig().initialVehicles.map((v) => ({ ...v }));
    this.render();
    this.overlay.classList.remove('hidden');
  }

  close() {
    this.overlay.classList.add('hidden');
  }

  render() {
    const config = this.getConfig();
    const network = this.getNetwork();

    const inflowRows = network.edges
      .map((edge) => {
        const existing = config.inflows.find((i) => i.edgeId === edge.id);
        const value = existing ? existing.flowRate : 0;
        return `<label>${edge.id}<input data-edge-id="${edge.id}" class="cfg-inflow" type="number" min="0" step="10" value="${value}"></label>`;
      })
      .join('');

    const laneOptionsFor = (selectedLaneId) =>
      network.lanes
        .map((l) => `<option value="${l.id}" ${l.id === selectedLaneId ? 'selected' : ''}>${l.id}</option>`)
        .join('');

    const vehicleRows = this.pendingInitialVehicles
      .map(
        (v, i) => `
          <div class="vehicle-row" data-index="${i}">
            <select class="veh-lane">${laneOptionsFor(v.laneId)}</select>
            <input class="veh-s" type="number" step="1" value="${v.s}" title="位置s[m]">
            <input class="veh-speed" type="number" step="0.5" value="${v.speed}" title="速度[m/s]">
            <button class="veh-remove-btn" data-index="${i}" type="button">&times;</button>
          </div>
        `
      )
      .join('');

    this.container.innerHTML = `
      <h2>シミュレーション設定</h2>
      <section>
        <h3>IDMデフォルト</h3>
        <label>希望速度[m/s]<input id="cfg-desired-speed" type="number" step="0.1" value="${config.idmDefaults.desiredSpeed}"></label>
        <label>安全車間時間[s]<input id="cfg-safe-time-headway" type="number" step="0.1" value="${config.idmDefaults.safeTimeHeadway}"></label>
        <label>最大加速度[m/s&sup2;]<input id="cfg-max-acceleration" type="number" step="0.1" value="${config.idmDefaults.maxAcceleration}"></label>
        <label>快適減速度[m/s&sup2;]<input id="cfg-comfortable-deceleration" type="number" step="0.1" value="${config.idmDefaults.comfortableDeceleration}"></label>
        <label>最小車間[m]<input id="cfg-min-gap" type="number" step="0.1" value="${config.idmDefaults.minGap}"></label>
      </section>
      <section>
        <h3>MOBILデフォルト</h3>
        <label>政治的パラメータ<input id="cfg-politeness" type="number" step="0.05" value="${config.mobilDefaults.politeness}"></label>
        <label>変更閾値[m/s&sup2;]<input id="cfg-change-threshold" type="number" step="0.05" value="${config.mobilDefaults.changeThreshold}"></label>
        <label>安全制動[m/s&sup2;]<input id="cfg-safe-braking" type="number" step="0.1" value="${config.mobilDefaults.safeBraking}"></label>
      </section>
      <section>
        <h3>流入設定[台/時]</h3>
        ${inflowRows || '<p>エッジがありません</p>'}
      </section>
      <section>
        <h3>初期配置車両(車線 / 位置s[m] / 速度[m/s])</h3>
        <div id="vehicle-rows">${vehicleRows || '<p>車両がありません</p>'}</div>
        <button id="cfg-vehicle-add-btn" type="button">車両を追加</button>
      </section>
      <div class="config-actions">
        <button id="config-export-btn" type="button">設定を書き出し</button>
        <button id="config-import-btn" type="button">設定を読み込み</button>
        <input id="config-import-input" type="file" accept="application/json" class="hidden">
        <button id="config-apply-btn" type="button">適用</button>
        <button id="config-close-btn" type="button">閉じる</button>
      </div>
    `;

    this.container.querySelector('#config-apply-btn').addEventListener('click', () => this.applyAndClose());
    this.container.querySelector('#config-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('#config-export-btn').addEventListener('click', () => this.exportConfig());
    this.container.querySelector('#config-import-btn').addEventListener('click', () => {
      this.container.querySelector('#config-import-input').click();
    });
    this.container.querySelector('#config-import-input').addEventListener('change', (e) => this.importConfig(e));

    this.container.querySelector('#cfg-vehicle-add-btn').addEventListener('click', () => {
      this.syncPendingInitialVehiclesFromDom();
      const defaultLaneId = network.lanes[0]?.id ?? '';
      this.pendingInitialVehicles.push({ laneId: defaultLaneId, s: 0, speed: 0 });
      this.render();
    });

    this.container.querySelectorAll('.veh-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.syncPendingInitialVehiclesFromDom();
        const index = Number(e.currentTarget.dataset.index);
        this.pendingInitialVehicles.splice(index, 1);
        this.render();
      });
    });
  }

  syncPendingInitialVehiclesFromDom() {
    this.pendingInitialVehicles = Array.from(this.container.querySelectorAll('.vehicle-row')).map((row) => ({
      laneId: row.querySelector('.veh-lane').value,
      s: Number(row.querySelector('.veh-s').value) || 0,
      speed: Number(row.querySelector('.veh-speed').value) || 0,
    }));
  }

  collectFormValues() {
    const q = (id) => this.container.querySelector(id);
    const idmDefaults = {
      desiredSpeed: Number(q('#cfg-desired-speed').value) || 0,
      safeTimeHeadway: Number(q('#cfg-safe-time-headway').value) || 0,
      maxAcceleration: Number(q('#cfg-max-acceleration').value) || 0,
      comfortableDeceleration: Number(q('#cfg-comfortable-deceleration').value) || 0,
      minGap: Number(q('#cfg-min-gap').value) || 0,
    };
    const mobilDefaults = {
      politeness: Number(q('#cfg-politeness').value) || 0,
      changeThreshold: Number(q('#cfg-change-threshold').value) || 0,
      safeBraking: Number(q('#cfg-safe-braking').value) || 0,
    };
    const inflows = Array.from(this.container.querySelectorAll('.cfg-inflow')).map((input) => ({
      edgeId: input.dataset.edgeId,
      flowRate: Number(input.value) || 0,
    }));
    const initialVehicles = Array.from(this.container.querySelectorAll('.vehicle-row')).map((row) => ({
      laneId: row.querySelector('.veh-lane').value,
      s: Number(row.querySelector('.veh-s').value) || 0,
      speed: Number(row.querySelector('.veh-speed').value) || 0,
    }));

    const current = this.getConfig();
    return { ...current, idmDefaults, mobilDefaults, inflows, initialVehicles };
  }

  applyAndClose() {
    this.onApply(this.collectFormValues());
    this.close();
  }

  exportConfig() {
    downloadJson('config.json', serializeConfig(this.collectFormValues()));
  }

  async importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const json = await readJsonFile(file);
    const imported = deserializeConfig(json);
    this.pendingInitialVehicles = imported.initialVehicles.map((v) => ({ ...v }));
    this.onApply(imported);
    e.target.value = '';
    this.render();
  }
}
