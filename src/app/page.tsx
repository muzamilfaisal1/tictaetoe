"use client";

import { useState, useEffect, useCallback } from "react";

type Player = "X" | "O" | null;
type GameMode = "menu" | "pvp" | "pvc";
type Difficulty = "easy" | "medium" | "hard";

type WinResult = {
  winner: Player;
  line: number[] | null;
};

function calculateWinner(squares: Player[]): WinResult {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

// Minimax algorithm for unbeatable AI
function minimax(
  squares: Player[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  const { winner } = calculateWinner(squares);

  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (squares.every((s) => s !== null)) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = "O";
        const evalScore = minimax(squares, depth + 1, false, alpha, beta);
        squares[i] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = "X";
        const evalScore = minimax(squares, depth + 1, true, alpha, beta);
        squares[i] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
}

function getBestMove(squares: Player[], difficulty: Difficulty): number {
  const emptySquares = squares
    .map((s, i) => (s === null ? i : -1))
    .filter((i) => i !== -1);

  if (emptySquares.length === 0) return -1;

  // Easy: Random moves
  if (difficulty === "easy") {
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  }

  // Medium: 50% chance of best move, 50% random
  if (difficulty === "medium" && Math.random() < 0.5) {
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  }

  // Hard/Medium(50%): Use minimax for best move
  let bestScore = -Infinity;
  let bestMove = emptySquares[0];

  for (const i of emptySquares) {
    const newSquares = [...squares];
    newSquares[i] = "O";
    const score = minimax(newSquares, 0, false, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

// Sound effect hook
function useSound() {
  const playSound = useCallback((type: "move" | "win" | "draw" | "click") => {
    if (typeof window === "undefined") return;

    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "move":
        oscillator.frequency.value = 600;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case "win":
        oscillator.frequency.value = 523.25;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          osc2.connect(gainNode);
          osc2.frequency.value = 659.25;
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.15);
        }, 150);
        setTimeout(() => {
          const osc3 = audioContext.createOscillator();
          osc3.connect(gainNode);
          osc3.frequency.value = 783.99;
          osc3.start();
          osc3.stop(audioContext.currentTime + 0.2);
        }, 300);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case "draw":
        oscillator.frequency.value = 300;
        oscillator.type = "triangle";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case "click":
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
    }
  }, []);

  return { playSound };
}

function Square({
  value,
  onClick,
  isWinning,
  index,
  disabled,
}: {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  index: number;
  disabled: boolean;
}) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (value) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <button
      disabled={disabled}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 text-5xl sm:text-6xl font-bold rounded-2xl transition-all duration-300 flex items-center justify-center
        backdrop-blur-sm border-2 overflow-hidden group
        ${isWinning
          ? "bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
          : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        }
        ${!value && !isWinning && !disabled ? "cursor-pointer" : ""}
        ${disabled && !value ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      <span
        className={`relative z-10 transition-all duration-300 ${isNew ? "scale-125 rotate-12" : "scale-100 rotate-0"}
          ${value === "X"
            ? "text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
            : value === "O"
            ? "text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.8)]"
            : ""
          }`}
      >
        {value}
      </span>
    </button>
  );
}

function Confetti({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; color: string; shape: string; delay: string; duration: string }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = [...Array(50)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a855f7", "#3b82f6", "#10b981"][i % 6],
        shape: Math.random() > 0.5 ? "50%" : "0",
        delay: `${Math.random() * 2}s`,
        duration: `${2 + Math.random() * 2}s`,
      }));
      setParticles(newParticles);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: p.left,
            top: "-10px",
            backgroundColor: p.color,
            borderRadius: p.shape,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

function ParticleBackground() {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; top: string; delay: string; duration: string }>>([]);

  useEffect(() => {
    setParticles(
      [...Array(20)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${5 + Math.random() * 10}s`,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

const lineStyles: Record<string, string> = {
  "0,1,2": "top-[3.5rem] sm:top-[3.75rem] left-0 w-full h-1.5",
  "3,4,5": "top-1/2 left-0 w-full h-1.5 -translate-y-1/2",
  "6,7,8": "bottom-[3.5rem] sm:bottom-[3.75rem] left-0 w-full h-1.5",
  "0,3,6": "top-0 left-[3rem] sm:left-[3.5rem] h-full w-1.5",
  "1,4,7": "top-0 left-1/2 h-full w-1.5 -translate-x-1/2",
  "2,5,8": "top-0 right-[3rem] sm:right-[3.5rem] h-full w-1.5",
  "0,4,8": "top-1/2 left-1/2 w-[140%] h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45",
  "2,4,6": "top-1/2 left-1/2 w-[140%] h-1.5 -translate-x-1/2 -translate-y-1/2 -rotate-45",
};

// Menu Screen Component
function MenuScreen({
  onSelectMode,
  playSound,
}: {
  onSelectMode: (mode: GameMode, difficulty?: Difficulty) => void;
  playSound: (type: "click") => void;
}) {
  const [showDifficulty, setShowDifficulty] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8 animate-fadeIn">
      <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-gradient drop-shadow-2xl text-center">
        Tic Tac Toe
      </h1>

      <p className="text-white/60 text-lg">Choose your game mode</p>

      {!showDifficulty ? (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => {
              playSound("click");
              onSelectMode("pvp");
            }}
            className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 animate-gradient" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <span>👥</span> Player vs Player
            </span>
          </button>

          <button
            onClick={() => {
              playSound("click");
              setShowDifficulty(true);
            }}
            className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(45,212,191,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 bg-size-200 animate-gradient" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <span>🤖</span> Player vs Computer
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-xs animate-fadeIn">
          <p className="text-white/80 text-center text-lg mb-2">Select Difficulty</p>

          <button
            onClick={() => {
              playSound("click");
              onSelectMode("pvc", "easy");
            }}
            className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <span>😊</span> Easy
            </span>
          </button>

          <button
            onClick={() => {
              playSound("click");
              onSelectMode("pvc", "medium");
            }}
            className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <span>🤔</span> Medium
            </span>
          </button>

          <button
            onClick={() => {
              playSound("click");
              onSelectMode("pvc", "hard");
            }}
            className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <span>🔥</span> Hard (Unbeatable)
            </span>
          </button>

          <button
            onClick={() => {
              playSound("click");
              setShowDifficulty(false);
            }}
            className="mt-2 text-white/60 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [squares, setSquares] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState<Player[][]>([Array(9).fill(null)]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);

  const { playSound } = useSound();

  const { winner, line } = calculateWinner(squares);
  const isDraw = !winner && squares.every((square) => square !== null);
  const isGameOver = !!winner || isDraw;

  // Handle score updates (only once per game)
  useEffect(() => {
    if (gameEnded) return;

    if (winner) {
      setGameEnded(true);
      setShowConfetti(true);
      setScores((prev) => ({ ...prev, [winner]: prev[winner as "X" | "O"] + 1 }));
      if (soundEnabled) playSound("win");
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    } else if (isDraw) {
      setGameEnded(true);
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      if (soundEnabled) playSound("draw");
    }
  }, [winner, isDraw, soundEnabled, playSound, gameEnded]);

  // Computer move (500ms delay for natural feel)
  useEffect(() => {
    if (gameMode === "pvc" && !isXNext && !isGameOver) {
      const timer = setTimeout(() => {
        const bestMove = getBestMove(squares, difficulty);
        if (bestMove !== -1) {
          const newSquares = [...squares];
          newSquares[bestMove] = "O";
          setSquares(newSquares);
          setHistory((prev) => [...prev, newSquares]);
          setIsXNext(true);
          if (soundEnabled) playSound("move");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, gameMode, squares, difficulty, isGameOver, soundEnabled, playSound]);

  const handleClick = (index: number) => {
    if (squares[index] || winner) return;
    if (gameMode === "pvc" && !isXNext) return;

    const newSquares = [...squares];
    newSquares[index] = isXNext ? "X" : "O";
    setSquares(newSquares);
    setHistory((prev) => [...prev, newSquares]);
    setIsXNext(!isXNext);
    if (soundEnabled) playSound("move");
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    if (soundEnabled) playSound("click");

    if (gameMode === "pvc") {
      // Undo both player and computer moves
      const newHistory = history.slice(0, -2);
      if (newHistory.length === 0) newHistory.push(Array(9).fill(null));
      setHistory(newHistory);
      setSquares(newHistory[newHistory.length - 1]);
      setIsXNext(true);
    } else {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setSquares(newHistory[newHistory.length - 1]);
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    if (soundEnabled) playSound("click");
    setSquares(Array(9).fill(null));
    setHistory([Array(9).fill(null)]);
    setIsXNext(true);
    setGameEnded(false);
  };

  const backToMenu = () => {
    if (soundEnabled) playSound("click");
    setGameMode("menu");
    resetGame();
  };

  const handleSelectMode = (mode: GameMode, diff?: Difficulty) => {
    setGameMode(mode);
    if (diff) setDifficulty(diff);
    resetGame();
  };

  const lineKey = line?.join(",") || "";
  const lineStyle = lineStyles[lineKey];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-gradient" />

      <ParticleBackground />
      <Confetti show={showConfetti} />

      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 right-4 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        title={soundEnabled ? "Mute sounds" : "Enable sounds"}
      >
        {soundEnabled ? "🔊" : "🔇"}
      </button>

      <div className="relative z-10 flex flex-col items-center">
        {gameMode === "menu" ? (
          <MenuScreen onSelectMode={handleSelectMode} playSound={playSound} />
        ) : (
          <>
            <h1 className="text-4xl sm:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-gradient drop-shadow-2xl">
              Tic Tac Toe
            </h1>

            {/* Mode indicator */}
            <div className="mb-4 px-4 py-1 rounded-full bg-white/10 text-white/70 text-sm">
              {gameMode === "pvp" ? "👥 Player vs Player" : `🤖 vs Computer (${difficulty})`}
            </div>

            {/* Scoreboard */}
            <div className="flex gap-3 sm:gap-4 mb-6">
              <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-pink-500/30">
                <div className="text-pink-400 text-xs sm:text-sm font-medium">
                  {gameMode === "pvc" ? "You (X)" : "Player X"}
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                  {scores.X}
                </div>
              </div>
              <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/20">
                <div className="text-gray-400 text-xs sm:text-sm font-medium">Draws</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-300">{scores.draws}</div>
              </div>
              <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 backdrop-blur-sm border border-cyan-500/30">
                <div className="text-cyan-400 text-xs sm:text-sm font-medium">
                  {gameMode === "pvc" ? "Computer" : "Player O"}
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  {scores.O}
                </div>
              </div>
            </div>

            {/* Status */}
            <div
              className={`text-lg sm:text-xl font-bold mb-4 px-5 py-2 rounded-full backdrop-blur-sm transition-all duration-500
                ${winner
                  ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                  : isDraw
                  ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/50"
                  : "bg-white/10 text-white/90 border border-white/20"
                }`}
            >
              {winner ? (
                <span className="flex items-center gap-2">
                  🎉 {gameMode === "pvc" ? (winner === "X" ? "You Win!" : "Computer Wins!") : `Player ${winner} Wins!`} 🎉
                </span>
              ) : isDraw ? (
                <span>🤝 It&apos;s a Draw! 🤝</span>
              ) : (
                <span className="flex items-center gap-2">
                  {gameMode === "pvc" ? "Your turn" : "Next:"}
                  <span
                    className={
                      isXNext
                        ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500"
                        : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400"
                    }
                  >
                    {isXNext ? "X" : "O"}
                  </span>
                </span>
              )}
            </div>

            {/* Game Board */}
            <div className="relative p-3 sm:p-4 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {squares.map((square, index) => (
                  <Square
                    key={index}
                    value={square}
                    onClick={() => handleClick(index)}
                    isWinning={line?.includes(index) || false}
                    index={index}
                    disabled={isGameOver}
                  />
                ))}
              </div>

              {line && lineStyle && (
                <div
                  className={`absolute ${lineStyle} bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 rounded-full pointer-events-none z-10 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.8)]`}
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="group relative px-5 py-2.5 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600" />
                <span className="relative z-10 flex items-center gap-2">
                  ↩️ Undo
                </span>
              </button>

              <button
                onClick={resetGame}
                className="group relative px-5 py-2.5 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600" />
                <span className="relative z-10">🔄 New Game</span>
              </button>

              <button
                onClick={backToMenu}
                className="group relative px-5 py-2.5 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(45,212,191,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-teal-600" />
                <span className="relative z-10">🏠 Menu</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
