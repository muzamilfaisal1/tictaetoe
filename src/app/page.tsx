"use client";

import { useState } from "react";
import TicTacToe from "@/components/TicTacToe";
import FlappyBird from "@/components/FlappyBird";
import Snake from "@/components/Snake";
import Asteroids from "@/components/Asteroids";
import EndlessRunner from "@/components/EndlessRunner";
import Tetris from "@/components/Tetris";

type GameType = "menu" | "tictactoe" | "flappybird" | "snake" | "asteroids" | "endlessrunner" | "tetris";

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
    id: "flappybird",
    title: "Flappy Bird",
    description: "Tap to fly through pipes. How far can you go?",
    emoji: "🐦",
    color: "bg-lime-500",
    rotation: "rotate-2",
  },
  {
    id: "snake",
    title: "Snake",
    description: "Eat food to grow longer. Don't hit the walls or yourself!",
    emoji: "🐍",
    color: "bg-emerald-500",
    rotation: "-rotate-1",
  },
  {
    id: "asteroids",
    title: "Asteroids",
    description: "Pilot your ship and blast asteroids into space dust!",
    emoji: "🚀",
    color: "bg-violet-500",
    rotation: "rotate-1",
  },
  {
    id: "endlessrunner",
    title: "Road Rush",
    description: "Dodge traffic, collect coins, and survive the endless road!",
    emoji: "🏎️",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    rotation: "-rotate-1",
  },
  {
    id: "tetris",
    title: "Tetris",
    description: "Stack falling blocks and clear lines. How long can you last?",
    emoji: "🧱",
    color: "bg-cyan-500",
    rotation: "rotate-1",
  },
];

function GameLauncher({ onSelectGame }: { onSelectGame: (game: GameType) => void }) {
  return (
    <div className="flex flex-col items-center">
      {/* Title */}
      <div className="bg-cyan-400 border-4 border-black px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-3 -rotate-1">
        <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
          ARCADE ALLEY
        </h1>
      </div>

      <p className="text-lg font-bold text-black mb-4 bg-yellow-400 px-3 py-1.5 border-4 border-black">
        Choose a game to play!
      </p>

      {/* Game Cards - 2 columns on mobile, 3 on larger screens */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-3xl px-3">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={`${game.color} ${game.rotation} p-3 sm:p-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
              hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100
              text-left group`}
          >
            <div className="text-4xl sm:text-5xl mb-2">{game.emoji}</div>
            <h2 className="text-lg sm:text-xl font-black text-white mb-1">{game.title}</h2>
            <p className="text-xs font-bold text-white/90 line-clamp-2">{game.description}</p>
            <div className="mt-2 sm:mt-3 inline-block bg-white text-black font-bold px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border-3 sm:border-4 border-black
              group-hover:bg-yellow-400 transition-colors">
              PLAY →
            </div>
          </button>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="mt-4 bg-gray-300 border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-bold text-black text-center text-sm">
          More games coming soon!
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

        {currentGame === "flappybird" && (
          <FlappyBird onBack={handleBack} />
        )}

        {currentGame === "snake" && (
          <Snake onBack={handleBack} />
        )}

        {currentGame === "asteroids" && (
          <Asteroids onBack={handleBack} />
        )}

        {currentGame === "endlessrunner" && (
          <EndlessRunner onBack={handleBack} />
        )}

        {currentGame === "tetris" && (
          <Tetris onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
