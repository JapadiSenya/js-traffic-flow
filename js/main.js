import { Camera, drawNetwork, drawVehicles, drawSignalStates } from './renderer/index.js';
import { deserializeNetwork, deserializeConfig } from './io/index.js';
import { Simulation } from './engine/index.js';

const SIMULATION_DT = 0.1; // シミュレーションの固定タイムステップ[s]
const MAX_STEP_PER_FRAME = 0.5; // タブが非アクティブ後の巨大な経過時間を打ち切る上限[s]

const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const camera = new Camera({ x: 0, y: 0, scale: 3 });

let network = { nodes: [], edges: [], lanes: [], signals: [] };
let simulation = null;

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawNetwork(ctx, camera, network);
  if (simulation) {
    drawSignalStates(ctx, camera, network, simulation.signalControllers);
    drawVehicles(ctx, camera, network, simulation.vehicles.values());
  }
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  render();
}

window.addEventListener('resize', resizeCanvas);

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top, canvas.width, canvas.height);
    render();
  },
  { passive: false }
);

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('pointerup', () => {
  dragging = false;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camera.panByScreenDelta(e.clientX - lastX, e.clientY - lastY);
  lastX = e.clientX;
  lastY = e.clientY;
  render();
});

let lastFrameTimeMs = null;

function tick(timestampMs) {
  if (lastFrameTimeMs == null) lastFrameTimeMs = timestampMs;
  let remaining = Math.min((timestampMs - lastFrameTimeMs) / 1000, MAX_STEP_PER_FRAME);
  lastFrameTimeMs = timestampMs;

  if (simulation) {
    while (remaining > 0) {
      const dt = Math.min(SIMULATION_DT, remaining);
      simulation.step(dt);
      remaining -= dt;
    }
  }

  render();
  requestAnimationFrame(tick);
}

async function init() {
  const [networkRes, configRes] = await Promise.all([
    fetch('data/samples/intersection.network.json'),
    fetch('data/samples/intersection.config.json'),
  ]);
  const [networkJson, configJson] = await Promise.all([networkRes.json(), configRes.json()]);

  network = deserializeNetwork(networkJson);
  const config = deserializeConfig(configJson);
  simulation = new Simulation({ network, config });

  resizeCanvas();
  requestAnimationFrame(tick);
}

init();
