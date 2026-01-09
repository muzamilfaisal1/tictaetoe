"use client";

import { useState, useCallback } from "react";

type Choice = "rock" | "paper" | "scissors" | null;
type Result = "win" | "lose" | "draw" | null;

const choices: Choice[] = ["rock", "paper", "scissors"];

const choiceEmojis: Record<string, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const choiceColors: Record<string, string> = {
  rock: "bg-orange-400",
  paper: "bg-cyan-400",
  scissors: "bg-rose-400",
};

function getResult(player: Choice, computer: Choice): Result {
  if (!player || !computer) return null;
  if (player === computer) return "draw";
  if (
    (player === "rock" && computer === "scissors") ||
    (player === "paper" && computer === "rock") ||
    (player === "scissors" && computer === "paper")
  ) {
    return "win";
  }
  return "lose";
}

function useSound() {
  const playSound = useCallback((type: "win" | "lose" | "draw" | "click") => {
    if (typeof window === "undefined") return;
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "win":
        oscillator.frequency.value = 523.25;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case "lose":
        oscillator.frequency.value = 200;
        oscillator.type = "sawtooth";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case "draw":
        oscillator.frequency.value = 300;
        oscillator.type = "triangle";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
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

function NeuButton({
  onClick,
  children,
  color = "bg-yellow-400",
  disabled = false,
  size = "normal",
}: {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
  size?: "normal" | "large";
}) {
  const sizeClass = size === "large" ? "px-8 py-6 text-6xl" : "px-6 py-3";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${color} ${sizeClass} font-bold text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      `}
    >
      {children}
    </button>
  );
}

export default function RockPaperScissors({ onBack }: { onBack: () => void }) {
  const [playerChoice, setPlayerChoice] = useState<Choice>(null);
  const [computerChoice, setComputerChoice] = useState<Choice>(null);
  const [result, setResult] = useState<Result>(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, draws: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const { playSound } = useSound();

  const handleChoice = (choice: Choice) => {
    if (isPlaying || !choice) return;

    setIsPlaying(true);
    setPlayerChoice(choice);

    if (soundEnabled) playSound("click");

    // Animate computer choice
    let count = 0;
    const interval = setInterval(() => {
      setComputerChoice(choices[count % 3]);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalChoice = choices[Math.floor(Math.random() * 3)];
        setComputerChoice(finalChoice);

        const gameResult = getResult(choice, finalChoice);
        setResult(gameResult);

        if (gameResult === "win") {
          setScores((prev) => ({ ...prev, player: prev.player + 1 }));
          if (soundEnabled) playSound("win");
        } else if (gameResult === "lose") {
          setScores((prev) => ({ ...prev, computer: prev.computer + 1 }));
          if (soundEnabled) playSound("lose");
        } else {
          setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
          if (soundEnabled) playSound("draw");
        }

        setIsPlaying(false);
      }
    }, 100);
  };

  const resetGame = () => {
    if (soundEnabled) playSound("click");
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
  };

  const resetScores = () => {
    if (soundEnabled) playSound("click");
    setScores({ player: 0, computer: 0, draws: 0 });
    resetGame();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 right-4 z-20 w-12 h-12 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-xl
          hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
      >
        {soundEnabled ? "🔊" : "🔇"}
      </button>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 px-4 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold
          hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
      >
        ← Games
      </button>

      {/* Title */}
      <div className="bg-violet-500 border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 rotate-1">
        <h1 className="text-2xl sm:text-3xl font-black text-white">ROCK PAPER SCISSORS</h1>
      </div>

      {/* Scoreboard */}
      <div className="flex gap-3 mb-6">
        <div className="px-4 py-2 bg-lime-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold text-black">YOU</div>
          <div className="text-3xl font-black text-black">{scores.player}</div>
        </div>
        <div className="px-4 py-2 bg-gray-200 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold text-black">DRAWS</div>
          <div className="text-3xl font-black text-black">{scores.draws}</div>
        </div>
        <div className="px-4 py-2 bg-rose-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold text-black">COMPUTER</div>
          <div className="text-3xl font-black text-black">{scores.computer}</div>
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
        {/* Choices Display */}
        <div className="flex items-center justify-center gap-8 mb-6">
          {/* Player */}
          <div className="flex flex-col items-center">
            <div className="text-sm font-bold mb-2">YOU</div>
            <div className={`w-24 h-24 border-4 border-black flex items-center justify-center text-5xl
              ${playerChoice ? choiceColors[playerChoice] : "bg-gray-100"}`}>
              {playerChoice ? choiceEmojis[playerChoice] : "?"}
            </div>
          </div>

          {/* VS */}
          <div className="text-2xl font-black">VS</div>

          {/* Computer */}
          <div className="flex flex-col items-center">
            <div className="text-sm font-bold mb-2">CPU</div>
            <div className={`w-24 h-24 border-4 border-black flex items-center justify-center text-5xl
              ${computerChoice ? choiceColors[computerChoice] : "bg-gray-100"}
              ${isPlaying ? "animate-pulse" : ""}`}>
              {computerChoice ? choiceEmojis[computerChoice] : "?"}
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`text-center text-2xl font-black mb-4 px-4 py-2 border-4 border-black
            ${result === "win" ? "bg-lime-400" : result === "lose" ? "bg-rose-400" : "bg-yellow-400"}`}>
            {result === "win" ? "YOU WIN! 🎉" : result === "lose" ? "YOU LOSE! 😢" : "IT'S A DRAW! 🤝"}
          </div>
        )}

        {/* Choice Buttons */}
        <div className="flex justify-center gap-4">
          {choices.map((choice) => (
            <NeuButton
              key={choice}
              onClick={() => handleChoice(choice)}
              color={choiceColors[choice!]}
              disabled={isPlaying}
              size="large"
            >
              {choiceEmojis[choice!]}
            </NeuButton>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <NeuButton onClick={resetGame} color="bg-cyan-400" disabled={isPlaying}>
          Play Again
        </NeuButton>
        <NeuButton onClick={resetScores} color="bg-orange-400" disabled={isPlaying}>
          Reset Scores
        </NeuButton>
      </div>
    </div>
  );
}
