/**
 * GameCanvas - Main game rendering component
 *
 * Renders the game area with lanes, runner(s), and coins
 * using a retro pixel art style.
 */

import { useRef, useEffect } from 'react';
import type { GameState, GameConfig } from '../types/game';
import { DEFAULT_CONFIG, BASIS_STATES } from '../types/game';
import './GameCanvas.css';

interface GameCanvasProps {
  gameState: GameState;
  config?: Partial<GameConfig>;
}

// Colors
const COLORS = {
  background: '#1a1a2e',
  lane: '#16213e',
  laneLine: '#0f3460',
  runner: '#e94560',
  runnerGhost: 'rgba(233, 69, 96, 0.4)',
  coin: '#ffd700',
  coinGlow: '#ffec8b',
  text: '#eee',
  activeIndicator: '#4ade80',
};

export function GameCanvas({ gameState, config: userConfig }: GameCanvasProps) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate canvas height based on lane count
  const canvasHeight = gameState.laneCount * config.laneHeight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable pixel art rendering
    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, config.canvasWidth, canvasHeight);

    // Draw lanes
    for (let i = 0; i < gameState.laneCount; i++) {
      const y = i * config.laneHeight;

      // Lane background
      ctx.fillStyle = i % 2 === 0 ? COLORS.lane : '#1e2a4a';
      ctx.fillRect(0, y, config.canvasWidth, config.laneHeight);

      // Lane divider line
      if (i > 0) {
        ctx.strokeStyle = COLORS.laneLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(config.canvasWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Lane label (basis state)
      const label = BASIS_STATES[gameState.laneCount][i];
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 8, y + config.laneHeight / 2);
    }

    // Draw runners (quantum ghosts)
    const runnerSize = 32;
    for (let i = 0; i < gameState.laneCount; i++) {
      const prob = gameState.probabilities[i] || 0;
      if (prob < 0.01) continue; // Skip negligible probabilities

      const y = i * config.laneHeight + config.laneHeight / 2;
      const isActive = prob >= config.activeThreshold;

      // Draw pixel art runner
      drawRunner(
        ctx,
        config.runnerX,
        y,
        runnerSize,
        prob,
        isActive,
        Date.now()
      );
    }

    // Draw coins
    const coinSize = 24;
    for (const step of gameState.steps) {
      for (let lane = 0; lane < gameState.laneCount; lane++) {
        if (step.coinLanes[lane]) {
          const y = lane * config.laneHeight + config.laneHeight / 2;
          drawCoin(ctx, step.x, y, coinSize, step.hit, Date.now());
        }
      }
    }

    // Draw score
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE: ${gameState.score}`, config.canvasWidth - 16, 12);

    // Draw probability indicators
    const barWidth = 40;
    const barHeight = 8;
    for (let i = 0; i < gameState.laneCount; i++) {
      const prob = gameState.probabilities[i] || 0;
      const y = i * config.laneHeight + config.laneHeight - 16;
      const x = config.runnerX - runnerSize / 2;

      // Background bar
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Probability fill
      const isActive = prob >= config.activeThreshold;
      ctx.fillStyle = isActive ? COLORS.activeIndicator : '#666';
      ctx.fillRect(x, y, barWidth * prob, barHeight);

      // Border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);

      // Percentage text
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(prob * 100)}%`, x + barWidth / 2, y + barHeight + 2);
    }
  }, [gameState, config, canvasHeight]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={config.canvasWidth}
        height={canvasHeight}
        className="game-canvas"
      />
      {!gameState.isRunning && gameState.steps.length === 0 && !gameState.isGameOver && (
        <div className="game-overlay">
          <div className="game-overlay-text">QUANTUM RUNNER</div>
          <div className="game-overlay-subtext">Build your circuit, then press START!</div>
        </div>
      )}
      {gameState.isGameOver && (
        <div className="game-overlay game-overlay--game-over">
          <div className="game-overlay-text">GAME OVER</div>
          <div className="game-overlay-score">SCORE: {gameState.score}</div>
          <div className="game-overlay-subtext">Press RESET to try again!</div>
        </div>
      )}
    </div>
  );
}

/** Draw pixel art runner */
function drawRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  probability: number,
  isActive: boolean,
  time: number
) {
  const halfSize = size / 2;
  const alpha = Math.max(0.2, probability);

  // Running animation frame
  const frame = Math.floor(time / 150) % 4;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Body (main rectangle)
  const bodyColor = isActive ? COLORS.runner : COLORS.runnerGhost;
  ctx.fillStyle = bodyColor;

  // Pixel art body (8x8 scaled up)
  const pixelSize = size / 8;

  // Simple running character sprite
  const sprites = [
    // Frame 0
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      '..XXXX..',
      '..XXXX..',
      '.XX..XX.',
      'XX....XX',
      '........',
    ],
    // Frame 1
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      '..XXXX..',
      '..XXXX..',
      '..X..X..',
      '.X....X.',
      '........',
    ],
    // Frame 2
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      '..XXXX..',
      '..XXXX..',
      '..XX.X..',
      '.X...X..',
      '........',
    ],
    // Frame 3
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      '..XXXX..',
      '..XXXX..',
      '..X.XX..',
      '..X...X.',
      '........',
    ],
  ];

  const sprite = sprites[frame];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (sprite[row][col] === 'X') {
        ctx.fillRect(
          x - halfSize + col * pixelSize,
          y - halfSize + row * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }

  // Glow effect for active runners
  if (isActive) {
    ctx.shadowColor = COLORS.runner;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    ctx.fillRect(x - halfSize - 4, y - halfSize - 4, size + 8, size + 8);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/** Draw pixel art coin */
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hit: boolean,
  time: number
) {
  const halfSize = size / 2;

  if (hit) {
    ctx.globalAlpha = 0.3;
  }

  // Coin spinning animation
  const frame = Math.floor(time / 100) % 4;
  const scaleX = [1, 0.7, 0.3, 0.7][frame];

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, 1);

  // Coin glow
  ctx.shadowColor = COLORS.coinGlow;
  ctx.shadowBlur = hit ? 0 : 8;

  // Coin body
  ctx.fillStyle = hit ? '#888' : COLORS.coin;
  ctx.beginPath();
  ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
  ctx.fill();

  // Coin inner detail
  ctx.fillStyle = hit ? '#666' : '#ffa500';
  ctx.beginPath();
  ctx.arc(0, 0, halfSize * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Q symbol
  ctx.fillStyle = hit ? '#888' : COLORS.coin;
  ctx.font = `bold ${size * 0.5}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Q', 0, 0);

  ctx.restore();
  ctx.globalAlpha = 1;
}
