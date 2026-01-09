"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type GameState = "menu" | "playing" | "gameover";

interface Pipe {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 40;
const BIRD_X = 80;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const GRAVITY = 0.5;
const JUMP_FORCE = -9;
const PIPE_SPEED = 3;

function useSound() {
  const playSound = useCallback((type: "jump" | "score" | "hit") => {
    if (typeof window === "undefined") return;
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "jump":
        oscillator.frequency.value = 400;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case "score":
        oscillator.frequency.value = 600;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case "hit":
        oscillator.frequency.value = 150;
        oscillator.type = "sawtooth";
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  }, []);
  return { playSound };
}

export default function FlappyBird({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const gameLoopRef = useRef<number | null>(null);
  const pipeIdRef = useRef(0);
  const { playSound } = useSound();

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("flappyHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("flappyHighScore", score.toString());
    }
  }, [score, highScore]);

  const jump = useCallback(() => {
    if (gameState === "playing") {
      setBirdVelocity(JUMP_FORCE);
      if (soundEnabled) playSound("jump");
    } else if (gameState === "menu" || gameState === "gameover") {
      startGame();
    }
  }, [gameState, soundEnabled, playSound]);

  const startGame = () => {
    setBirdY(GAME_HEIGHT / 2);
    setBirdVelocity(0);
    setPipes([]);
    setScore(0);
    pipeIdRef.current = 0;
    setGameState("playing");
  };

  const endGame = useCallback(() => {
    setGameState("gameover");
    if (soundEnabled) playSound("hit");
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  }, [soundEnabled, playSound]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    let lastPipeSpawn = Date.now();

    const gameLoop = () => {
      // Update bird
      setBirdVelocity((v) => v + GRAVITY);
      setBirdY((y) => {
        const newY = y + birdVelocity;
        // Check ground/ceiling collision
        if (newY < 0 || newY > GAME_HEIGHT - BIRD_SIZE) {
          endGame();
          return y;
        }
        return newY;
      });

      // Spawn pipes
      const now = Date.now();
      if (now - lastPipeSpawn > 1800) {
        lastPipeSpawn = now;
        const gapY = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
        setPipes((prev) => [
          ...prev,
          { id: pipeIdRef.current++, x: GAME_WIDTH, gapY, passed: false },
        ]);
      }

      // Update pipes
      setPipes((prev) => {
        return prev
          .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
          .filter((pipe) => pipe.x > -PIPE_WIDTH);
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, birdVelocity, endGame]);

  // Collision detection and scoring
  useEffect(() => {
    if (gameState !== "playing") return;

    pipes.forEach((pipe) => {
      const birdLeft = BIRD_X;
      const birdRight = BIRD_X + BIRD_SIZE;
      const birdTop = birdY;
      const birdBottom = birdY + BIRD_SIZE;

      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const gapTop = pipe.gapY;
      const gapBottom = pipe.gapY + PIPE_GAP;

      // Check collision
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < gapTop || birdBottom > gapBottom) {
          endGame();
        }
      }

      // Check if passed pipe
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.passed = true;
        setScore((s) => s + 1);
        if (soundEnabled) playSound("score");
      }
    });
  }, [pipes, birdY, gameState, endGame, soundEnabled, playSound]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jump]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top bar */}
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
      <div className="bg-lime-400 border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 rotate-1">
        <h1 className="text-3xl sm:text-4xl font-black text-black">FLAPPY BIRD</h1>
      </div>

      {/* Score display */}
      <div className="flex gap-4 mb-4">
        <div className="px-4 py-2 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">SCORE</div>
          <div className="text-3xl font-black">{score}</div>
        </div>
        <div className="px-4 py-2 bg-orange-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">BEST</div>
          <div className="text-3xl font-black">{highScore}</div>
        </div>
      </div>

      {/* Game area */}
      <div
        className="relative bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      >
        {/* Clouds decoration */}
        <div className="absolute top-10 left-10 w-16 h-8 bg-white border-2 border-black rounded-full" />
        <div className="absolute top-20 right-20 w-20 h-10 bg-white border-2 border-black rounded-full" />
        <div className="absolute top-40 left-1/2 w-14 h-7 bg-white border-2 border-black rounded-full" />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-lime-500 border-t-4 border-black" />

        {/* Pipes */}
        {pipes.map((pipe) => (
          <div key={pipe.id}>
            {/* Top pipe */}
            <div
              className="absolute bg-lime-500 border-4 border-black"
              style={{
                left: pipe.x,
                top: 0,
                width: PIPE_WIDTH,
                height: pipe.gapY,
              }}
            >
              {/* Pipe cap */}
              <div className="absolute -left-1 -bottom-0 w-[68px] h-6 bg-lime-600 border-4 border-black" />
            </div>

            {/* Bottom pipe */}
            <div
              className="absolute bg-lime-500 border-4 border-black"
              style={{
                left: pipe.x,
                top: pipe.gapY + PIPE_GAP,
                width: PIPE_WIDTH,
                height: GAME_HEIGHT - pipe.gapY - PIPE_GAP,
              }}
            >
              {/* Pipe cap */}
              <div className="absolute -left-1 -top-0 w-[68px] h-6 bg-lime-600 border-4 border-black" />
            </div>
          </div>
        ))}

        {/* Bird */}
        <div
          className="absolute bg-yellow-400 border-4 border-black rounded-lg flex items-center justify-center transition-transform"
          style={{
            left: BIRD_X,
            top: birdY,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            transform: `rotate(${Math.min(birdVelocity * 3, 45)}deg)`,
          }}
        >
          {/* Eye */}
          <div className="absolute top-1 right-1 w-3 h-3 bg-white border-2 border-black rounded-full">
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black rounded-full" />
          </div>
          {/* Beak */}
          <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0
            border-t-[6px] border-t-transparent
            border-l-[10px] border-l-orange-500
            border-b-[6px] border-b-transparent" />
          {/* Wing */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-3 bg-yellow-500 border-2 border-black rounded" />
        </div>

        {/* Menu overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-4xl mb-4">🐦</div>
              <h2 className="text-2xl font-black mb-4">READY?</h2>
              <p className="font-bold mb-4">Tap or Press Space to Flap!</p>
              <div className="bg-lime-400 border-4 border-black px-6 py-3 font-black text-xl">
                TAP TO START
              </div>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <h2 className="text-3xl font-black mb-2 text-rose-500">GAME OVER</h2>
              <div className="text-5xl font-black mb-2">{score}</div>
              <p className="font-bold text-gray-600 mb-4">
                {score > 0 && score >= highScore ? "NEW HIGH SCORE!" : `Best: ${highScore}`}
              </p>
              <div className="bg-cyan-400 border-4 border-black px-6 py-3 font-black text-xl cursor-pointer hover:bg-cyan-300">
                TAP TO RETRY
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 px-4 py-2 bg-white border-4 border-black font-bold text-sm text-center">
        <span className="hidden sm:inline">Press SPACE or Click to flap</span>
        <span className="sm:hidden">Tap to flap</span>
      </div>
    </div>
  );
}
