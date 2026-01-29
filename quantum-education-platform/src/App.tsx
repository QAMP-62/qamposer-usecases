import { useState, useCallback } from "react";
import { Qamposer } from "@qamposer/react/visualization";
import { qiskitAdapter, type SimulationCompleteEvent } from "@qamposer/react";
import "./App.css";

// Gate type mapping: internal type -> QASM instruction
const GATE_TO_QASM: Record<string, string> = {
  H: "h",
  X: "x",
  Y: "y",
  Z: "z",
  CNOT: "cx",
  RX: "rx",
  RY: "ry",
  RZ: "rz",
};

// Lessons data with friendly descriptions
const lessons = [
  {
    id: 1,
    title: "Hadamard Gate",
    description: "Create superposition with the H gate",
    objective: "Add an H gate to qubit q[0] to create a superposition state.",
    hint: "Drag the H gate from the Operations panel onto q[0]. This puts the qubit in a state that's both 0 and 1 at the same time!",
    expectedGates: ["h"],
    encouragement: "Amazing! You just created quantum superposition!",
  },
  {
    id: 2,
    title: "NOT Gate (X)",
    description: "Flip a qubit with the X gate",
    objective: "Use the X gate to flip qubit q[0] from |0⟩ to |1⟩.",
    hint: "The X gate acts like a classical NOT gate - it flips 0 to 1 and 1 to 0!",
    expectedGates: ["x"],
    encouragement: "Perfect! You flipped the qubit like a pro!",
  },
  {
    id: 3,
    title: "Bell State",
    description: "Create quantum entanglement",
    objective: "Create a Bell state using H and CNOT gates.",
    hint: "First apply H to q[0], then apply CNOT with q[0] as control and q[1] as target. This creates entanglement!",
    expectedGates: ["h", "cx"],
    encouragement: "Incredible! You just entangled two qubits!",
  },
];

const adapter = qiskitAdapter("http://localhost:8080");

type ValidationResult = {
  success: boolean;
  message: string;
} | null;

// Confetti component for celebrations
function Confetti({ count = 50 }: { count?: number }) {
  const colors = ["#ff8a7a", "#3db4a4", "#9b8adc", "#f5c842", "#ffb4a8", "#7dd3c8"];

  const confettiPieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 8;
    const shape = Math.random() > 0.5 ? "50%" : "0";

    return (
      <div
        key={i}
        className="confetti"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: color,
          borderRadius: shape,
          animationDelay: `${delay}s`,
        }}
      />
    );
  });

  return <div className="confetti-container">{confettiPieces}</div>;
}

function App() {
  const [selectedLesson, setSelectedLesson] = useState(lessons[0]);
  const [showHint, setShowHint] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  const triggerCelebration = useCallback((message: string) => {
    setShowConfetti(true);
    setEncouragement(message);

    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    setTimeout(() => {
      setEncouragement(null);
    }, 2500);
  }, []);

  const handleSimulationComplete = useCallback((event: SimulationCompleteEvent) => {
    console.log("Simulation complete:", event);

    // Convert circuit gates to QASM instruction names
    const circuitGates = event.circuit.gates.map(
      (gate) => GATE_TO_QASM[gate.type] || gate.type.toLowerCase()
    );

    // Check if all expected gates are present in the circuit
    const expectedGates = selectedLesson.expectedGates;
    const hasAllExpectedGates = expectedGates.every((expected) =>
      circuitGates.includes(expected)
    );

    // Check for extra gates (optional: can make this stricter)
    const hasOnlyExpectedGates = circuitGates.every((gate) =>
      expectedGates.includes(gate)
    );

    if (hasAllExpectedGates) {
      // Mark lesson as completed
      const isNewCompletion = !completedLessons.includes(selectedLesson.id);

      if (isNewCompletion) {
        setCompletedLessons([...completedLessons, selectedLesson.id]);
        triggerCelebration(selectedLesson.encouragement);
      }

      if (hasOnlyExpectedGates) {
        setValidationResult({
          success: true,
          message: isNewCompletion
            ? "Fantastic! You've completed this lesson!"
            : "Great job! You've got it!",
        });
      } else {
        setValidationResult({
          success: true,
          message: "Nice work! You used the required gates (plus some extra ones).",
        });
      }
    } else {
      // Show what's missing with encouraging message
      const missingGates = expectedGates.filter(
        (expected) => !circuitGates.includes(expected)
      );
      setValidationResult({
        success: false,
        message: `Almost there! Try adding: ${missingGates.join(", ").toUpperCase()}`,
      });
    }

    // Clear validation result after 4 seconds
    setTimeout(() => setValidationResult(null), 4000);
  }, [selectedLesson, completedLessons, triggerCelebration]);

  const progressPercent = (completedLessons.length / lessons.length) * 100;

  return (
    <div className="app">
      {/* Celebration Effects */}
      {showConfetti && <Confetti count={60} />}
      {encouragement && (
        <div className="encouragement">
          {encouragement}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <span className="sidebar__logo-icon">🔮</span>
            <span className="sidebar__logo-text">Quantum Playground</span>
          </div>
          <p className="sidebar__tagline">Learn quantum computing, one gate at a time</p>
        </div>

        <nav className="sidebar__nav">
          <h3 className="sidebar__section-title">Your Journey</h3>
          <ul className="sidebar__list">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  className={`sidebar__item ${
                    selectedLesson.id === lesson.id
                      ? "sidebar__item--active"
                      : ""
                  } ${
                    completedLessons.includes(lesson.id)
                      ? "sidebar__item--completed"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setShowHint(false);
                    setValidationResult(null);
                  }}
                >
                  <span className="sidebar__item-number">{lesson.id}</span>
                  <span className="sidebar__item-content">
                    <span className="sidebar__item-title">{lesson.title}</span>
                    <span className="sidebar__item-desc">
                      {lesson.description}
                    </span>
                  </span>
                  {completedLessons.includes(lesson.id) && (
                    <span className="sidebar__item-check">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__progress">
            <div className="sidebar__progress-header">
              <span className="sidebar__progress-label">Your Progress</span>
              <span className="sidebar__progress-text">
                {completedLessons.length} / {lessons.length}
              </span>
            </div>
            <div className="sidebar__progress-bar">
              <div
                className="sidebar__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Challenge Panel */}
        <div className="challenge-panel">
          <div className="challenge-panel__content">
            <div className="challenge-panel__info">
              <span className="challenge-panel__badge">
                Lesson {selectedLesson.id}
              </span>
              <h2 className="challenge-panel__title">{selectedLesson.title}</h2>
              <p className="challenge-panel__objective">
                {selectedLesson.objective}
              </p>
            </div>
            <div className="challenge-panel__actions">
              <button
                className="challenge-panel__hint-btn"
                onClick={() => setShowHint(!showHint)}
              >
                {showHint ? "Hide Hint" : "Need a Hint?"}
              </button>
            </div>
          </div>
          {showHint && (
            <div className="challenge-panel__hint">
              <span className="challenge-panel__hint-icon">💡</span>
              <span>{selectedLesson.hint}</span>
            </div>
          )}
          {validationResult && (
            <div
              className={`challenge-panel__result ${
                validationResult.success
                  ? "challenge-panel__result--success"
                  : "challenge-panel__result--error"
              }`}
            >
              <span className="challenge-panel__result-icon">
                {validationResult.success ? "✓" : "→"}
              </span>
              <span>{validationResult.message}</span>
            </div>
          )}
        </div>

        {/* Qamposer Component */}
        <div className="qamposer-container">
          <Qamposer
            key={selectedLesson.id}
            adapter={adapter}
            showHeader={true}
            onSimulationComplete={handleSimulationComplete}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
