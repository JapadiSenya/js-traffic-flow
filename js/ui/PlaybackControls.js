/**
 * 再生/一時停止・再生速度変更を扱うUIコントロール。
 * DOM要素とコールバックを受け取り、状態(isPlaying, speed)を保持する。
 */
export class PlaybackControls {
  constructor({ playPauseButton, speedSelect, onToggle, onSpeedChange }) {
    this.playPauseButton = playPauseButton;
    this.isPlaying = true;
    this.speed = Number(speedSelect.value);

    this.playPauseButton.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.updatePlayPauseLabel();
      onToggle?.(this.isPlaying);
    });

    speedSelect.addEventListener('change', () => {
      this.speed = Number(speedSelect.value);
      onSpeedChange?.(this.speed);
    });

    this.updatePlayPauseLabel();
  }

  updatePlayPauseLabel() {
    this.playPauseButton.textContent = this.isPlaying ? '一時停止' : '再生';
  }
}
