const HIT_RADIUS_PX = 8;
const DRAG_THRESHOLD_PX = 3;

/**
 * エディタモードでのCanvas操作(ノード配置・エッジ接続・削除・選択・ドラッグ移動)を扱う。
 * setActive(false)の間は一切のイベントを処理せず、シミュレーションモード側の
 * パン操作(main.js)と共存する。
 */
export class EditorInteraction {
  constructor({ canvas, camera, state, onChange }) {
    this.canvas = canvas;
    this.camera = camera;
    this.state = state;
    this.onChange = onChange;

    this.tool = 'select'; // 'select' | 'add-node' | 'add-edge' | 'delete'
    this.pendingEdgeStartNodeId = null;
    this.active = false;

    this.dragging = null; // { type: 'node', id } | { type: 'pan' }
    this.dragStartScreen = null;
    this.dragMoved = false;
    this.lastScreen = null;

    canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  setActive(active) {
    this.active = active;
    this.dragging = null;
    this.pendingEdgeStartNodeId = null;
  }

  setTool(tool) {
    this.tool = tool;
    this.pendingEdgeStartNodeId = null;
    this.state.selection = null;
    this.onChange?.();
  }

  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return this.camera.screenToWorld(clientX - rect.left, clientY - rect.top, this.canvas.width, this.canvas.height);
  }

  hitRadiusInWorld() {
    return HIT_RADIUS_PX / this.camera.scale;
  }

  handlePointerDown(e) {
    if (!this.active) return;

    this.dragStartScreen = { x: e.clientX, y: e.clientY };
    this.lastScreen = { x: e.clientX, y: e.clientY };
    this.dragMoved = false;

    if (this.tool === 'select') {
      const world = this.toWorld(e.clientX, e.clientY);
      const node = this.state.findNodeNear(world.x, world.y, this.hitRadiusInWorld());
      this.dragging = node ? { type: 'node', id: node.id } : { type: 'pan' };
    } else {
      this.dragging = { type: 'pan' };
    }
  }

  handlePointerMove(e) {
    if (!this.active || !this.dragging) return;

    const dx = e.clientX - this.lastScreen.x;
    const dy = e.clientY - this.lastScreen.y;
    if (Math.hypot(e.clientX - this.dragStartScreen.x, e.clientY - this.dragStartScreen.y) > DRAG_THRESHOLD_PX) {
      this.dragMoved = true;
    }

    if (this.dragging.type === 'node') {
      const world = this.toWorld(e.clientX, e.clientY);
      this.state.moveNode(this.dragging.id, world.x, world.y);
      this.onChange?.();
    } else if (this.dragging.type === 'pan') {
      this.camera.panByScreenDelta(dx, dy);
      this.onChange?.();
    }

    this.lastScreen = { x: e.clientX, y: e.clientY };
  }

  handlePointerUp(e) {
    if (!this.active || !this.dragging) return;

    if (!this.dragMoved) {
      this.handleClick(e.clientX, e.clientY);
    }
    this.dragging = null;
  }

  handleClick(clientX, clientY) {
    const world = this.toWorld(clientX, clientY);
    const nodeRadius = this.hitRadiusInWorld();
    const edgeRadius = this.hitRadiusInWorld();

    if (this.tool === 'add-node') {
      const node = this.state.addNode(world.x, world.y);
      this.state.selection = { type: 'node', id: node.id };
      this.onChange?.();
      return;
    }

    if (this.tool === 'add-edge') {
      const node = this.state.findNodeNear(world.x, world.y, nodeRadius);
      if (!node) return;
      if (!this.pendingEdgeStartNodeId) {
        this.pendingEdgeStartNodeId = node.id;
        this.state.selection = { type: 'node', id: node.id };
      } else if (node.id !== this.pendingEdgeStartNodeId) {
        const edge = this.state.addEdge(this.pendingEdgeStartNodeId, node.id, 1);
        this.pendingEdgeStartNodeId = null;
        this.state.selection = { type: 'edge', id: edge.id };
      }
      this.onChange?.();
      return;
    }

    if (this.tool === 'delete') {
      const node = this.state.findNodeNear(world.x, world.y, nodeRadius);
      if (node) {
        this.state.removeNode(node.id);
        this.state.selection = null;
        this.onChange?.();
        return;
      }
      const edge = this.state.findEdgeNear(world.x, world.y, edgeRadius);
      if (edge) {
        this.state.removeEdge(edge.id);
        this.state.selection = null;
        this.onChange?.();
      }
      return;
    }

    // select
    const node = this.state.findNodeNear(world.x, world.y, nodeRadius);
    if (node) {
      this.state.selection = { type: 'node', id: node.id };
      this.onChange?.();
      return;
    }
    const edge = this.state.findEdgeNear(world.x, world.y, edgeRadius);
    this.state.selection = edge ? { type: 'edge', id: edge.id } : null;
    this.onChange?.();
  }
}
