/**
 * Quantum Runner Game Types
 */

export interface Step {
  id: string;
  /** Which lanes have coins (indexed by lane number) */
  coinLanes: boolean[];
  /** Current X position (decreases as step moves left) */
  x: number;
  /** Whether the step has been scored already */
  hit: boolean;
}

export interface GameState {
  /** Number of qubits (1 or 2) */
  numQubits: 1 | 2;
  /** Number of lanes (2 for 1 qubit, 4 for 2 qubits) */
  laneCount: 2 | 4;
  /** Probability distribution for each lane */
  probabilities: number[];
  /** Current score */
  score: number;
  /** Interval between step spawns in seconds */
  stepIntervalSec: number;
  /** Speed of coins moving (pixels per second) */
  coinSpeed: number;
  /** Active steps on screen */
  steps: Step[];
  /** Whether the game is running */
  isRunning: boolean;
  /** Whether the game is over (missed a coin) */
  isGameOver: boolean;
  /** Time since last step spawn */
  timeSinceLastStep: number;
}

export interface GameConfig {
  /** Runner X position (fixed) */
  runnerX: number;
  /** Canvas width */
  canvasWidth: number;
  /** Canvas height */
  canvasHeight: number;
  /** Lane height */
  laneHeight: number;
  /** Threshold for considering a lane "active" */
  activeThreshold: number;
  /** Number of visible steps ahead */
  visibleSteps: number;
}

/** Basis states for display */
export const BASIS_STATES: Record<number, string[]> = {
  2: ["|0⟩", "|1⟩"],
  4: ["|00⟩", "|01⟩", "|10⟩", "|11⟩"],
};

/** Generate a unique step ID */
export function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Create initial game state */
export function createInitialGameState(numQubits: 1 | 2 = 1): GameState {
  const laneCount = numQubits === 1 ? 2 : 4;
  const probabilities = new Array(laneCount).fill(0);
  probabilities[0] = 1; // Start in |0⟩ or |00⟩ state

  return {
    numQubits,
    laneCount,
    probabilities,
    score: 0,
    stepIntervalSec: 2.0,
    coinSpeed: 115,
    steps: [],
    isRunning: false,
    isGameOver: false,
    timeSinceLastStep: 0,
  };
}

/** Default game configuration */
export const DEFAULT_CONFIG: GameConfig = {
  runnerX: 80,
  canvasWidth: 600,
  canvasHeight: 240,
  laneHeight: 60,
  activeThreshold: 0.23,
  visibleSteps: 2,
};
