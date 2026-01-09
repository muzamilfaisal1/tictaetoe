"use client";

import { useState, useEffect } from "react";

type Player = "X" | "O" | null;

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

function Square({
  value,
  onClick,
  isWinning,
  index,
}: {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  index: number;
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
      className={`relative w-24 h-24 sm:w-28 sm:h-28 text-5xl sm:text-6xl font-bold rounded-2xl transition-all duration-300 flex items-center justify-center
        backdrop-blur-sm border-2 overflow-hidden group
        ${isWinning
          ? "bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-105"
          : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        }
        ${!value && !isWinning ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      <span
        className={`relative z-10 transition-all duration-300 ${isNew ? "scale-125" : "scale-100"}
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

// Confetti component
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            backgroundColor: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a855f7", "#3b82f6", "#10b981"][i % 6],
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

// Floating particles background
function ParticleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
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

export default function Home() {
  const [squares, setSquares] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  const { winner, line } = calculateWinner(squares);
  const isDraw = !winner && squares.every((square) => square !== null);

  useEffect(() => {
    if (winner) {
      setShowConfetti(true);
      setScores((prev) => ({ ...prev, [winner]: prev[winner as "X" | "O"] + 1 }));
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    } else if (isDraw) {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    }
  }, [winner, isDraw]);

  const handleClick = (index: number) => {
    if (squares[index] || winner) return;

    const newSquares = squares.slice();
    newSquares[index] = isXNext ? "X" : "O";
    setSquares(newSquares);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setSquares(Array(9).fill(null));
    setIsXNext(true);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  const lineKey = line?.join(",") || "";
  const lineStyle = lineStyles[lineKey];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-gradient" />

      <ParticleBackground />
      <Confetti show={showConfetti} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-gradient drop-shadow-2xl">
          Tic Tac Toe
        </h1>

        {/* Scoreboard */}
        <div className="flex gap-4 mb-8">
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-pink-500/30">
            <div className="text-pink-400 text-sm font-medium">Player X</div>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              {scores.X}
            </div>
          </div>
          <div className="px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/20">
            <div className="text-gray-400 text-sm font-medium">Draws</div>
            <div className="text-3xl font-bold text-gray-300">{scores.draws}</div>
          </div>
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 backdrop-blur-sm border border-cyan-500/30">
            <div className="text-cyan-400 text-sm font-medium">Player O</div>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {scores.O}
            </div>
          </div>
        </div>

        {/* Status */}
        <div
          className={`text-xl sm:text-2xl font-bold mb-6 px-6 py-2 rounded-full backdrop-blur-sm transition-all duration-500
            ${winner
              ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-bounce"
              : isDraw
              ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/50"
              : "bg-white/10 text-white/90 border border-white/20"
            }`}
        >
          {winner ? (
            <span className="flex items-center gap-2">
              🎉 Player {winner} Wins! 🎉
            </span>
          ) : isDraw ? (
            <span>🤝 It&apos;s a Draw! 🤝</span>
          ) : (
            <span className="flex items-center gap-2">
              Next:
              <span className={isXNext
                ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500"
                : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400"
              }>
                {isXNext ? "X" : "O"}
              </span>
            </span>
          )}
        </div>

        {/* Game Board */}
        <div className="relative p-4 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="grid grid-cols-3 gap-3">
            {squares.map((square, index) => (
              <Square
                key={index}
                value={square}
                onClick={() => handleClick(index)}
                isWinning={line?.includes(index) || false}
                index={index}
              />
            ))}
          </div>

          {/* Winning line */}
          {line && lineStyle && (
            <div
              className={`absolute ${lineStyle} bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 rounded-full pointer-events-none z-10 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.8)]`}
            />
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={resetGame}
            className="group relative px-8 py-3 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">New Game</span>
          </button>
          <button
            onClick={resetScores}
            className="group relative px-8 py-3 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(45,212,191,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-teal-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">Reset All</span>
          </button>
        </div>
      </div>
    </div>
  );
}
