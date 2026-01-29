/**
 * Game loop hook for Quantum Runner
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { GameState, GameConfig, Step } from '../types/game';
import { generateStepId, DEFAULT_CONFIG } from '../types/game';

interface UseGameLoopProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  config?: Partial<GameConfig>;
}

/** Generate a random step with coins (1 to 2^n coins, where n = qubits) */
function generateStep(laneCount: number, spawnX: number): Step {
  // Random coin pattern
  const coinLanes = new Array(laneCount).fill(false);

  // Randomly decide how many coins (1 to laneCount, i.e., 1 to 2^n)
  const numCoins = Math.floor(Math.random() * laneCount) + 1;

  // Randomly place coins
  const availableLanes = Array.from({ length: laneCount }, (_, i) => i);
  for (let i = 0; i < numCoins; i++) {
    const idx = Math.floor(Math.random() * availableLanes.length);
    coinLanes[availableLanes[idx]] = true;
    availableLanes.splice(idx, 1);
  }

  return {
    id: generateStepId(),
    coinLanes,
    x: spawnX,
    hit: false,
  };
}

export function useGameLoop({ gameState, setGameState, config: userConfig }: UseGameLoopProps) {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const update = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const dt = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
    lastTimeRef.current = timestamp;

    setGameState((prev) => {
      if (!prev.isRunning || prev.isGameOver) return prev;

      let { steps, score, timeSinceLastStep } = prev;
      const { probabilities, coinSpeed, stepIntervalSec, laneCount } = prev;
      let isGameOver = false;

      // Update step positions
      steps = steps.map((step) => ({
        ...step,
        x: step.x - coinSpeed * dt,
      }));

      // Check for hits (step reached runner)
      steps = steps.map((step) => {
        if (!step.hit && step.x <= config.runnerX) {
          // Calculate which lanes are active (runner is present)
          const activeLanes = probabilities
            .map((p, i) => (p >= config.activeThreshold ? i : -1))
            .filter((i) => i >= 0);

          let coinsCollected = 0;

          for (let lane = 0; lane < laneCount; lane++) {
            const isActive = activeLanes.includes(lane);
            const hasCoin = step.coinLanes[lane];

            if (isActive && hasCoin) {
              // Coin collected!
              coinsCollected++;
            } else if (isActive && !hasCoin) {
              // Runner hit empty lane - Game Over!
              isGameOver = true;
            } else if (!isActive && hasCoin) {
              // Missed a coin - Game Over!
              isGameOver = true;
            }
            // !isActive && !hasCoin is fine (no runner, no coin)
          }

          score += coinsCollected;
          return { ...step, hit: true };
        }
        return step;
      });

      // If game over, stop immediately
      if (isGameOver) {
        return {
          ...prev,
          steps,
          score,
          isRunning: false,
          isGameOver: true,
        };
      }

      // Remove steps that are off-screen
      steps = steps.filter((step) => step.x > -50);

      // Spawn new steps
      timeSinceLastStep += dt;
      if (timeSinceLastStep >= stepIntervalSec) {
        const spawnX = config.canvasWidth + 50;
        steps.push(generateStep(laneCount, spawnX));
        timeSinceLastStep = 0;
      }

      return {
        ...prev,
        steps,
        score,
        timeSinceLastStep,
      };
    });

    animationFrameRef.current = requestAnimationFrame(update);
  }, [setGameState, config]);

  useEffect(() => {
    if (gameState.isRunning) {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(update);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isRunning, update]);

  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isRunning: true,
      isGameOver: false,
      score: 0,
      steps: [generateStep(prev.laneCount, config.canvasWidth)],
      timeSinceLastStep: 0,
    }));
  }, [setGameState, config]);

  const stopGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, [setGameState]);

  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isRunning: false,
      isGameOver: false,
      score: 0,
      steps: [],
      timeSinceLastStep: 0,
    }));
  }, [setGameState]);

  return { startGame, stopGame, resetGame };
}
