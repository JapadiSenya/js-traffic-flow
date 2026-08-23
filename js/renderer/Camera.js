/**
 * 物理座標(メートル単位)とCanvas描画座標(ピクセル単位)の変換を一元管理する。
 * x, y は画面中心が指す物理座標。scaleはピクセル/メートル。
 */
export class Camera {
  constructor({ x = 0, y = 0, scale = 5 } = {}) {
    this.x = x;
    this.y = y;
    this.scale = scale;
  }

  worldToScreen(wx, wy, canvasWidth, canvasHeight) {
    return {
      x: (wx - this.x) * this.scale + canvasWidth / 2,
      y: (wy - this.y) * this.scale + canvasHeight / 2,
    };
  }

  screenToWorld(sx, sy, canvasWidth, canvasHeight) {
    return {
      x: (sx - canvasWidth / 2) / this.scale + this.x,
      y: (sy - canvasHeight / 2) / this.scale + this.y,
    };
  }

  zoomAt(factor, screenX, screenY, canvasWidth, canvasHeight) {
    const before = this.screenToWorld(screenX, screenY, canvasWidth, canvasHeight);
    this.scale *= factor;
    const after = this.screenToWorld(screenX, screenY, canvasWidth, canvasHeight);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }

  panByScreenDelta(dx, dy) {
    this.x -= dx / this.scale;
    this.y -= dy / this.scale;
  }
}
