/**
 * Quantum Runner - Main Application
 *
 * A quantum-powered runner game where players use quantum gates
 * to control the runner's probability distribution across lanes.
 */

import { useState, useCallback } from 'react';
import { QamposerMicro, noopAdapter } from '@qamposer/react';
import type { Circuit } from '@qamposer/react';
import { GameCanvas } from './components/GameCanvas';
import { Controls } from './components/Controls';
import { useQuantumSimulator } from './hooks/useQuantumSimulator';
import { useGameLoop } from './hooks/useGameLoop';
import { createInitialGameState } from './types/game';
import type { GameState } from './types/game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(1));
  const { simulate } = useQuantumSimulator();
  const { startGame, stopGame, resetGame } = useGameLoop({ gameState, setGameState });

  // Handle circuit changes from QamposerMicro
  const handleCircuitChange = useCallback(
    (circuit: Circuit) => {
      // Update number of qubits if changed
      const newNumQubits = circuit.qubits as 1 | 2;
      const clampedQubits = Math.min(2, Math.max(1, newNumQubits)) as 1 | 2;

      // Simulate the circuit to get probabilities
      const probabilities = simulate(circuit);

      setGameState((prev) => {
        // If qubit count changed, reset steps
        const qubitChanged = prev.numQubits !== clampedQubits;
        const laneCount = clampedQubits === 1 ? 2 : 4;

        return {
          ...prev,
          numQubits: clampedQubits,
          laneCount,
          probabilities,
          // Reset steps if qubit count changed
          steps: qubitChanged ? [] : prev.steps,
          isRunning: qubitChanged ? false : prev.isRunning,
        };
      });
    },
    [simulate]
  );

  // Handlers for controls
  const handleSpeedChange = useCallback((speed: number) => {
    setGameState((prev) => ({ ...prev, coinSpeed: speed }));
  }, []);

  const handleIntervalChange = useCallback((interval: number) => {
    setGameState((prev) => ({ ...prev, stepIntervalSec: interval }));
  }, []);

  // Default circuit with correct qubit count
  const defaultCircuit: Circuit = {
    qubits: gameState.numQubits,
    gates: [],
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">QUANTUM RUNNER</h1>
        <p className="app__subtitle">
          Build quantum circuits to collect coins across multiple lanes!
        </p>
      </header>

      <main className="app__main">
        {/* Game Area */}
        <section className="app__game-section">
          <GameCanvas gameState={gameState} />
          <Controls
            gameState={gameState}
            onStart={startGame}
            onStop={stopGame}
            onReset={resetGame}
            onSpeedChange={handleSpeedChange}
            onIntervalChange={handleIntervalChange}
          />
        </section>

        {/* Circuit Editor */}
        <section className="app__circuit-section">
          <div className="app__circuit-header">
            <h2>Quantum Circuit</h2>
            <p>Drag gates to change your runner's quantum state!</p>
          </div>
          <div className="app__circuit-editor">
            <QamposerMicro
              defaultCircuit={defaultCircuit}
              onCircuitChange={handleCircuitChange}
              adapter={noopAdapter}
              showHeader={false}
              showThemeToggle={false}
              gridTemplate="180px 1fr"
            />
          </div>
        </section>
      </main>

      <footer className="app__footer">
        <div className="app__instructions">
          <h3>How to Play</h3>
          <ul>
            <li>
              <strong>|0⟩ state:</strong> Runner stays in Lane 1 (top)
            </li>
            <li>
              <strong>H gate:</strong> Creates superposition - runner appears in both lanes!
            </li>
            <li>
              <strong>Active lanes (≥25%):</strong> Collect coins but also hit empty spaces
            </li>
            <li>
              <strong>Goal:</strong> Match your quantum state to coin positions for max score
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default App;
