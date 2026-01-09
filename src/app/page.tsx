"use client";

import { useState } from "react";
import TicTacToe from "@/components/TicTacToe";
import RockPaperScissors from "@/components/RockPaperScissors";

type GameType = "menu" | "tictactoe" | "rps";

interface GameCard {
  id: GameType;
  title: string;
  description: string;
  emoji: string;
  color: string;
  rotation: string;
}

const games: GameCard[] = [
  {
    id: "tictactoe",
    title: "Tic Tac Toe",
    description: "Classic X and O game. Play against a friend or computer!",
    emoji: "⭕",
    color: "bg-rose-500",
    rotation: "-rotate-2",
  },
  {
    id: "rps",
    title: "Rock Paper Scissors",
    description: "Test your luck against the computer!",
    emoji: "✂️",
    color: "bg-violet-500",
    rotation: "rotate-2",
  },
];

function GameLauncher({ onSelectGame }: { onSelectGame: (game: GameType) => void }) {
  return (
    <div className="flex flex-col items-center">
      {/* Title */}
      <div className="bg-cyan-400 border-4 border-black px-8 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4 -rotate-1">
        <h1 className="text-4xl sm:text-6xl font-black text-black tracking-tight">
          GAME ZONE
        </h1>
      </div>

      <p className="text-xl font-bold text-black mb-8 bg-yellow-400 px-4 py-2 border-4 border-black">
        Choose a game to play!
      </p>

      {/* Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={`${game.color} ${game.rotation} p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-100
              text-left group`}
          >
            <div className="text-6xl mb-4">{game.emoji}</div>
            <h2 className="text-2xl font-black text-white mb-2">{game.title}</h2>
            <p className="text-sm font-bold text-white/90">{game.description}</p>
            <div className="mt-4 inline-block bg-white text-black font-bold px-4 py-2 border-4 border-black
              group-hover:bg-yellow-400 transition-colors">
              PLAY NOW →
            </div>
          </button>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="mt-8 bg-gray-300 border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-bold text-black text-center">
          🚧 More games coming soon! 🚧
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentGame, setCurrentGame] = useState<GameType>("menu");

  const handleBack = () => {
    setCurrentGame("menu");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-amber-200">
      {/* Pattern background */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {currentGame === "menu" && (
          <GameLauncher onSelectGame={setCurrentGame} />
        )}

        {currentGame === "tictactoe" && (
          <TicTacToe onBack={handleBack} />
        )}

        {currentGame === "rps" && (
          <RockPaperScissors onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
