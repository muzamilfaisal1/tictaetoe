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
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

function minimax(squares: Player[], depth: number, isMaximizing: boolean, alpha: number, beta: number): number {
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
  const emptySquares = squares.map((s, i) => (s === null ? i : -1)).filter((i) => i !== -1);
  if (emptySquares.length === 0) return -1;

  if (difficulty === "easy") {
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  }
  if (difficulty === "medium" && Math.random() < 0.5) {
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  }

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

function useSound() {
  const playSound = useCallback((type: "move" | "win" | "draw" | "click") => {
    if (typeof window === "undefined") return;
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  disabled,
}: {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-24 h-24 sm:w-28 sm:h-28 text-5xl sm:text-6xl font-black border-4 border-black flex items-center justify-center
        transition-all duration-100
        ${isWinning
          ? "bg-lime-400"
          : "bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
        }
        ${!isWinning ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}
        ${!value && !disabled ? "cursor-pointer hover:bg-gray-100" : ""}
        ${disabled && !value ? "opacity-60" : ""}
      `}
    >
      <span className={value === "X" ? "text-rose-500" : "text-violet-600"}>
        {value}
      </span>
    </button>
  );
}

function NeuButton({
  onClick,
  children,
  color = "bg-yellow-400",
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${color} px-6 py-3 font-bold text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      `}
    >
      {children}
    </button>
  );
}

const lineStyles: Record<string, string> = {
  "0,1,2": "top-[3rem] sm:top-14 left-2 right-2 h-2",
  "3,4,5": "top-1/2 -translate-y-1/2 left-2 right-2 h-2",
  "6,7,8": "bottom-[3rem] sm:bottom-14 left-2 right-2 h-2",
  "0,3,6": "left-[3rem] sm:left-14 top-2 bottom-2 w-2",
  "1,4,7": "left-1/2 -translate-x-1/2 top-2 bottom-2 w-2",
  "2,5,8": "right-[3rem] sm:right-14 top-2 bottom-2 w-2",
  "0,4,8": "top-1/2 left-1/2 w-[130%] h-2 -translate-x-1/2 -translate-y-1/2 rotate-45",
  "2,4,6": "top-1/2 left-1/2 w-[130%] h-2 -translate-x-1/2 -translate-y-1/2 -rotate-45",
};

function ModeMenu({
  onSelectMode,
  playSound,
}: {
  onSelectMode: (mode: GameMode, difficulty?: Difficulty) => void;
  playSound: (type: "click") => void;
}) {
  const [showDifficulty, setShowDifficulty] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-xl font-bold text-black bg-yellow-400 px-4 py-2 border-4 border-black">
        Choose game mode
      </p>

      {!showDifficulty ? (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <NeuButton onClick={() => { playSound("click"); onSelectMode("pvp"); }} color="bg-cyan-400">
            <span className="text-xl">Player vs Player</span>
          </NeuButton>
          <NeuButton onClick={() => { playSound("click"); setShowDifficulty(true); }} color="bg-violet-400">
            <span className="text-xl">Player vs Computer</span>
          </NeuButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <p className="text-lg font-bold text-center text-black">Select Difficulty</p>
          <NeuButton onClick={() => { playSound("click"); onSelectMode("pvc", "easy"); }} color="bg-lime-400">
            <span className="text-xl">Easy</span>
          </NeuButton>
          <NeuButton onClick={() => { playSound("click"); onSelectMode("pvc", "medium"); }} color="bg-orange-400">
            <span className="text-xl">Medium</span>
          </NeuButton>
          <NeuButton onClick={() => { playSound("click"); onSelectMode("pvc", "hard"); }} color="bg-rose-500">
            <span className="text-xl">Hard</span>
          </NeuButton>
          <button onClick={() => { playSound("click"); setShowDifficulty(false); }} className="mt-2 font-bold text-black underline underline-offset-4 hover:text-gray-600">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [squares, setSquares] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [history, setHistory] = useState<Player[][]>([Array(9).fill(null)]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);

  const { playSound } = useSound();
  const { winner, line } = calculateWinner(squares);
  const isDraw = !winner && squares.every((square) => square !== null);
  const isGameOver = !!winner || isDraw;

  useEffect(() => {
    if (gameEnded) return;
    if (winner) {
      setGameEnded(true);
      setScores((prev) => ({ ...prev, [winner]: prev[winner as "X" | "O"] + 1 }));
      if (soundEnabled) playSound("win");
    } else if (isDraw) {
      setGameEnded(true);
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      if (soundEnabled) playSound("draw");
    }
  }, [winner, isDraw, soundEnabled, playSound, gameEnded]);

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

  const handleSelectMode = (mode: GameMode, diff?: Difficulty) => {
    setGameMode(mode);
    if (diff) setDifficulty(diff);
    resetGame();
  };

  const lineKey = line?.join(",") || "";
  const lineStyle = lineStyles[lineKey];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top bar with back and sound buttons */}
      <div className="w-full flex justify-between items-center mb-6 px-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          ← Games
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-12 h-12 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-xl
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Title */}
      <div className="bg-rose-500 border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 -rotate-1">
        <h1 className="text-3xl sm:text-4xl font-black text-white">TIC TAC TOE</h1>
      </div>

      {gameMode === "menu" ? (
        <ModeMenu onSelectMode={handleSelectMode} playSound={playSound} />
      ) : (
        <>
          {/* Mode indicator */}
          <div className="mb-4 px-4 py-1 bg-white border-4 border-black font-bold text-sm">
            {gameMode === "pvp" ? "Player vs Player" : `vs Computer (${difficulty})`}
          </div>

          {/* Scoreboard */}
          <div className="flex gap-3 mb-6">
            <div className="px-4 py-2 bg-rose-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xs font-bold text-black">{gameMode === "pvc" ? "YOU (X)" : "PLAYER X"}</div>
              <div className="text-3xl font-black text-black">{scores.X}</div>
            </div>
            <div className="px-4 py-2 bg-gray-200 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xs font-bold text-black">DRAWS</div>
              <div className="text-3xl font-black text-black">{scores.draws}</div>
            </div>
            <div className="px-4 py-2 bg-violet-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xs font-bold text-black">{gameMode === "pvc" ? "COMPUTER" : "PLAYER O"}</div>
              <div className="text-3xl font-black text-black">{scores.O}</div>
            </div>
          </div>

          {/* Status */}
          <div className={`mb-4 px-6 py-2 border-4 border-black font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            ${winner ? "bg-lime-400" : isDraw ? "bg-orange-400" : "bg-cyan-400"}`}
          >
            {winner ? (
              <span>{gameMode === "pvc" ? (winner === "X" ? "YOU WIN!" : "COMPUTER WINS!") : `PLAYER ${winner} WINS!`}</span>
            ) : isDraw ? (
              <span>IT&apos;S A DRAW!</span>
            ) : (
              <span>
                {gameMode === "pvc" ? "YOUR TURN: " : "NEXT: "}
                <span className={isXNext ? "text-rose-600" : "text-violet-700"}>{isXNext ? "X" : "O"}</span>
              </span>
            )}
          </div>

          {/* Game Board */}
          <div className="relative p-4 bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="grid grid-cols-3 gap-3">
              {squares.map((square, index) => (
                <Square
                  key={index}
                  value={square}
                  onClick={() => handleClick(index)}
                  isWinning={line?.includes(index) || false}
                  disabled={isGameOver}
                />
              ))}
            </div>

            {/* Winning line */}
            {line && lineStyle && (
              <div className={`absolute ${lineStyle} bg-black rounded-full pointer-events-none z-10`} />
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <NeuButton onClick={handleUndo} color="bg-orange-400" disabled={history.length <= 1}>
              ↩ Undo
            </NeuButton>
            <NeuButton onClick={resetGame} color="bg-cyan-400">
              New Game
            </NeuButton>
            <NeuButton onClick={() => { playSound("click"); setGameMode("menu"); }} color="bg-violet-400">
              Mode
            </NeuButton>
          </div>
        </>
      )}
    </div>
  );
}
