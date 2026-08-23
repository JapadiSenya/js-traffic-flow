/**
 * 固定時間制御による信号コントローラー。
 * 感応制御・系統制御など将来の制御方式は、この
 * update(dt) / isMovementAllowed(laneId, movement) の
 * インターフェースを満たすクラスとして差し替えられるようにしてある。
 */
export class FixedTimeSignalController {
  constructor(signal) {
    this.signal = signal;
    this.currentPhaseIndex = 0;
    this.elapsed = 0;
  }

  update(dt) {
    const phases = this.signal.phases;
    if (phases.length === 0) return;

    this.elapsed += dt;
    let phase = phases[this.currentPhaseIndex];
    while (this.elapsed >= phase.duration) {
      this.elapsed -= phase.duration;
      this.currentPhaseIndex = (this.currentPhaseIndex + 1) % phases.length;
      phase = phases[this.currentPhaseIndex];
    }
  }

  getCurrentPhase() {
    return this.signal.phases[this.currentPhaseIndex];
  }

  isMovementAllowed(laneId, movement) {
    const phase = this.getCurrentPhase();
    if (!phase) return false;
    return phase.allowedMovements.some((m) => m.laneId === laneId && m.movement === movement);
  }
}
