import { Camera, drawNetwork, drawVehicles, drawSignalStates } from './renderer/index.js';
import { deserializeNetwork, deserializeConfig } from './io/index.js';
import { Simulation } from './engine/index.js';
import { PlaybackControls } from './ui/index.js';
import { TrajectoryRecorder, drawDiagram } from './diagram/index.js';

const SIMULATION_DT = 0.1; // シミュレーションの固定タイムステップ[s]
const MAX_STEP_PER_FRAME = 0.5; // タブが非アクティブ後の巨大な経過時間を打ち切る上限[s]
const DIAGRAM_RECORD_DURATION = 60; // 時空間図の記録時間[s]

const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const camera = new Camera({ x: 0, y: 0, scale: 3 });

const playback = new PlaybackControls({
  playPauseButton: document.getElementById('play-pause-btn'),
  speedSelect: document.getElementById('speed-select'),
});

const diagramButton = document.getElementById('diagram-btn');
const diagramOverlay = document.getElementById('diagram-overlay');
const diagramCanvas = document.getElementById('diagram-canvas');
const diagramCtx = diagramCanvas.getContext('2d');
const diagramCloseButton = document.getElementById('diagram-close-btn');

let network = { nodes: [], edges: [], lanes: [], signals: [] };
let config = null;
let simulation = null;
let recorder = null;
let recordStartTime = null;

diagramButton.addEventListener('click', () => {
  if (!simulation || recorder) return;
  recorder = new TrajectoryRecorder(config.diagramRoute, simulation.laneLength);
  recordStartTime = simulation.time;
  diagramButton.disabled = true;
  diagramButton.textContent = '記録中...';
});

diagramCloseButton.addEventListener('click', () => {
  diagramOverlay.classList.add('hidden');
});

function showDiagram() {
  diagramOverlay.classList.remove('hidden');
  diagramCanvas.width = diagramCanvas.clientWidth;
  diagramCanvas.height = diagramCanvas.clientHeight;
  drawDiagram(diagramCtx, recorder.trajectories, [recordStartTime, simulation.time], [0, recorder.totalDistance]);

  recorder = null;
  recordStartTime = null;
  diagramButton.disabled = false;
  diagramButton.textContent = '時空間図を表示';
}

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

  if (simulation && playback.isPlaying) {
    remaining *= playback.speed;
    while (remaining > 0) {
      const dt = Math.min(SIMULATION_DT, remaining);
      simulation.step(dt);
      if (recorder) recorder.record(simulation.time, simulation.vehicles.values());
      remaining -= dt;
    }

    if (recorder && simulation.time - recordStartTime >= DIAGRAM_RECORD_DURATION) {
      showDiagram();
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
  config = deserializeConfig(configJson);
  simulation = new Simulation({ network, config });

  resizeCanvas();
  requestAnimationFrame(tick);
}

init();
