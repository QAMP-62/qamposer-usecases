/**
 * Local quantum circuit simulator
 *
 * Simulates quantum circuits to get probability distributions
 * without needing a backend server.
 */

import { useCallback } from 'react';
import type { Circuit, Gate } from '@qamposer/react';

// Complex number representation
interface Complex {
  re: number;
  im: number;
}

const complex = (re: number, im: number = 0): Complex => ({ re, im });
const complexMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const complexAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});
const complexAbs2 = (c: Complex): number => c.re * c.re + c.im * c.im;

// Gate matrices (2x2)
type Matrix2x2 = [[Complex, Complex], [Complex, Complex]];

const IDENTITY: Matrix2x2 = [
  [complex(1), complex(0)],
  [complex(0), complex(1)],
];

const HADAMARD: Matrix2x2 = [
  [complex(1 / Math.sqrt(2)), complex(1 / Math.sqrt(2))],
  [complex(1 / Math.sqrt(2)), complex(-1 / Math.sqrt(2))],
];

const PAULI_X: Matrix2x2 = [
  [complex(0), complex(1)],
  [complex(1), complex(0)],
];

const PAULI_Y: Matrix2x2 = [
  [complex(0), complex(0, -1)],
  [complex(0, 1), complex(0)],
];

const PAULI_Z: Matrix2x2 = [
  [complex(1), complex(0)],
  [complex(0), complex(-1)],
];

function rotationX(theta: number): Matrix2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [complex(c), complex(0, -s)],
    [complex(0, -s), complex(c)],
  ];
}

function rotationY(theta: number): Matrix2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [complex(c), complex(-s)],
    [complex(s), complex(c)],
  ];
}

function rotationZ(theta: number): Matrix2x2 {
  const halfTheta = theta / 2;
  return [
    [complex(Math.cos(-halfTheta), Math.sin(-halfTheta)), complex(0)],
    [complex(0), complex(Math.cos(halfTheta), Math.sin(halfTheta))],
  ];
}

function getGateMatrix(gate: Gate): Matrix2x2 {
  switch (gate.type) {
    case 'H': return HADAMARD;
    case 'X': return PAULI_X;
    case 'Y': return PAULI_Y;
    case 'Z': return PAULI_Z;
    case 'RX': return rotationX(gate.parameter ?? 0);
    case 'RY': return rotationY(gate.parameter ?? 0);
    case 'RZ': return rotationZ(gate.parameter ?? 0);
    default: return IDENTITY;
  }
}

// Apply single-qubit gate to state vector
function applySingleQubitGate(
  state: Complex[],
  matrix: Matrix2x2,
  targetQubit: number,
  numQubits: number
): Complex[] {
  const dim = 1 << numQubits;
  const newState: Complex[] = new Array(dim).fill(null).map(() => complex(0));

  for (let i = 0; i < dim; i++) {
    const bit = (i >> targetQubit) & 1;
    const i0 = i & ~(1 << targetQubit); // index with target bit = 0
    const i1 = i | (1 << targetQubit);  // index with target bit = 1

    if (bit === 0) {
      // Compute new amplitudes for both i0 and i1
      newState[i0] = complexAdd(
        complexMul(matrix[0][0], state[i0]),
        complexMul(matrix[0][1], state[i1])
      );
      newState[i1] = complexAdd(
        complexMul(matrix[1][0], state[i0]),
        complexMul(matrix[1][1], state[i1])
      );
    }
  }

  return newState;
}

// Apply CNOT gate
function applyCNOT(
  state: Complex[],
  control: number,
  target: number,
  numQubits: number
): Complex[] {
  const dim = 1 << numQubits;
  const newState: Complex[] = [...state];

  for (let i = 0; i < dim; i++) {
    const controlBit = (i >> control) & 1;
    if (controlBit === 1) {
      const j = i ^ (1 << target); // flip target bit
      // Swap amplitudes
      if (i < j) {
        [newState[i], newState[j]] = [newState[j], newState[i]];
      }
    }
  }

  return newState;
}

// Simulate circuit and return probabilities
function simulateCircuit(circuit: Circuit): number[] {
  const numQubits = circuit.qubits;
  const dim = 1 << numQubits;

  // Initialize state to |0...0⟩
  let state: Complex[] = new Array(dim).fill(null).map(() => complex(0));
  state[0] = complex(1);

  // Sort gates by position
  const sortedGates = [...circuit.gates].sort((a, b) => a.position - b.position);

  // Apply each gate
  for (const gate of sortedGates) {
    if (gate.type === 'CNOT') {
      if (gate.control !== undefined && gate.target !== undefined) {
        state = applyCNOT(state, gate.control, gate.target, numQubits);
      }
    } else if (gate.qubit !== undefined) {
      const matrix = getGateMatrix(gate);
      state = applySingleQubitGate(state, matrix, gate.qubit, numQubits);
    }
  }

  // Calculate probabilities
  return state.map(complexAbs2);
}

export function useQuantumSimulator() {
  const simulate = useCallback((circuit: Circuit): number[] => {
    if (circuit.gates.length === 0) {
      // Return |0...0⟩ state
      const dim = 1 << circuit.qubits;
      const probs = new Array(dim).fill(0);
      probs[0] = 1;
      return probs;
    }
    return simulateCircuit(circuit);
  }, []);

  return { simulate };
}
