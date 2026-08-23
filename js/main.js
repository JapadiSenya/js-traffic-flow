import { Camera, drawNetwork } from './renderer/index.js';
import { deserializeNetwork } from './io/index.js';

const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const camera = new Camera({ x: 0, y: 0, scale: 3 });

let network = { nodes: [], edges: [], lanes: [], signals: [] };

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawNetwork(ctx, camera, network);
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

async function init() {
  const res = await fetch('data/samples/intersection.network.json');
  const json = await res.json();
  network = deserializeNetwork(json);
  resizeCanvas();
}

init();
