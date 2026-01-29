/**
 * Game Controls Component
 */

import type { GameState } from '../types/game';
import './Controls.css';

interface ControlsProps {
  gameState: GameState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onIntervalChange: (interval: number) => void;
}

export function Controls({
  gameState,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  onIntervalChange,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls__buttons">
        {!gameState.isRunning ? (
          <button className="controls__btn controls__btn--start" onClick={onStart}>
            START
          </button>
        ) : (
          <button className="controls__btn controls__btn--stop" onClick={onStop}>
            PAUSE
          </button>
        )}
        <button className="controls__btn controls__btn--reset" onClick={onReset}>
          RESET
        </button>
      </div>

      <div className="controls__sliders">
        <div className="controls__slider-group">
          <label className="controls__label">
            Speed: {gameState.coinSpeed}px/s
          </label>
          <input
            type="range"
            className="controls__slider"
            min="50"
            max="500"
            step="10"
            value={gameState.coinSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
          />
        </div>

        <div className="controls__slider-group">
          <label className="controls__label">
            Spawn: {gameState.stepIntervalSec.toFixed(1)}s
          </label>
          <input
            type="range"
            className="controls__slider"
            min="0.5"
            max="4"
            step="0.1"
            value={gameState.stepIntervalSec}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="controls__info">
        <div className="controls__stat">
          <span className="controls__stat-label">Qubits:</span>
          <span className="controls__stat-value">{gameState.numQubits}</span>
        </div>
        <div className="controls__stat">
          <span className="controls__stat-label">Lanes:</span>
          <span className="controls__stat-value">{gameState.laneCount}</span>
        </div>
        <div className="controls__stat controls__stat--score">
          <span className="controls__stat-label">Score:</span>
          <span className="controls__stat-value">{gameState.score}</span>
        </div>
      </div>
    </div>
  );
}
