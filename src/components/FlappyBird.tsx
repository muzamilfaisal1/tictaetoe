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
const PIPE_GAP = 150;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const PIPE_SPEED = 4;

function useSound() {
  const playSound = useCallback((type: "jump" | "score" | "hit") => {
    if (typeof window === "undefined") return;
    try {
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
    } catch (e) {
      // Audio not supported
    }
  }, []);
  return { playSound };
}

export default function FlappyBird({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
  const [birdRotation, setBirdRotation] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Use refs for game loop values
  const birdYRef = useRef(GAME_HEIGHT / 2);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>("menu");
  const lastPipeSpawnRef = useRef(0);
  const pipeIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const { playSound } = useSound();

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("flappyHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current === "playing") {
      birdVelocityRef.current = JUMP_FORCE;
      if (soundEnabled) playSound("jump");
    } else if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
      // Start game
      birdYRef.current = GAME_HEIGHT / 2;
      birdVelocityRef.current = 0;
      pipesRef.current = [];
      scoreRef.current = 0;
      pipeIdRef.current = 0;
      lastPipeSpawnRef.current = Date.now();

      setBirdY(GAME_HEIGHT / 2);
      setBirdRotation(0);
      setPipes([]);
      setScore(0);
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [soundEnabled, playSound]);

  const endGame = useCallback(() => {
    if (gameStateRef.current !== "playing") return;

    setGameState("gameover");
    gameStateRef.current = "gameover";

    if (soundEnabled) playSound("hit");

    // Update high score
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem("flappyHighScore", scoreRef.current.toString());
    }
  }, [soundEnabled, playSound, highScore]);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      if (gameStateRef.current !== "playing") return;

      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current += birdVelocityRef.current;

      // Check boundaries
      if (birdYRef.current < 0) {
        birdYRef.current = 0;
        birdVelocityRef.current = 0;
      }

      if (birdYRef.current > GAME_HEIGHT - BIRD_SIZE - 4) {
        endGame();
        return;
      }

      // Spawn pipes
      const now = Date.now();
      if (now - lastPipeSpawnRef.current > 1600) {
        lastPipeSpawnRef.current = now;
        const gapY = Math.random() * (GAME_HEIGHT - PIPE_GAP - 150) + 75;
        pipesRef.current.push({
          id: pipeIdRef.current++,
          x: GAME_WIDTH,
          gapY,
          passed: false,
        });
      }

      // Update pipes and check collisions
      const birdLeft = BIRD_X;
      const birdRight = BIRD_X + BIRD_SIZE;
      const birdTop = birdYRef.current;
      const birdBottom = birdYRef.current + BIRD_SIZE;

      pipesRef.current = pipesRef.current
        .map((pipe) => {
          pipe.x -= PIPE_SPEED;

          // Check collision
          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + PIPE_WIDTH;
          const gapTop = pipe.gapY;
          const gapBottom = pipe.gapY + PIPE_GAP;

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < gapTop || birdBottom > gapBottom) {
              endGame();
            }
          }

          // Check if passed
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            if (soundEnabled) playSound("score");
          }

          return pipe;
        })
        .filter((pipe) => pipe.x > -PIPE_WIDTH);

      // Update React state for rendering
      setBirdY(birdYRef.current);
      setBirdRotation(Math.min(Math.max(birdVelocityRef.current * 3, -30), 90));
      setPipes([...pipesRef.current]);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, endGame, soundEnabled, playSound]);

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
        className="relative bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer select-none"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      >
        {/* Clouds decoration */}
        <div className="absolute top-10 left-10 w-16 h-8 bg-white border-2 border-black rounded-full opacity-80" />
        <div className="absolute top-20 right-20 w-20 h-10 bg-white border-2 border-black rounded-full opacity-80" />
        <div className="absolute top-40 left-1/2 w-14 h-7 bg-white border-2 border-black rounded-full opacity-80" />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-lime-600 border-t-4 border-black" />

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
              <div
                className="absolute left-[-4px] bottom-0 bg-lime-600 border-4 border-black"
                style={{ width: PIPE_WIDTH + 8, height: 24 }}
              />
            </div>

            {/* Bottom pipe */}
            <div
              className="absolute bg-lime-500 border-4 border-black"
              style={{
                left: pipe.x,
                top: pipe.gapY + PIPE_GAP,
                width: PIPE_WIDTH,
                height: GAME_HEIGHT - pipe.gapY - PIPE_GAP - 4,
              }}
            >
              <div
                className="absolute left-[-4px] top-0 bg-lime-600 border-4 border-black"
                style={{ width: PIPE_WIDTH + 8, height: 24 }}
              />
            </div>
          </div>
        ))}

        {/* Bird */}
        <div
          className="absolute bg-yellow-400 border-4 border-black rounded-lg"
          style={{
            left: BIRD_X,
            top: birdY,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            transform: `rotate(${birdRotation}deg)`,
          }}
        >
          {/* Eye */}
          <div className="absolute top-1 right-1 w-3 h-3 bg-white border-2 border-black rounded-full">
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black rounded-full" />
          </div>
          {/* Beak */}
          <div
            className="absolute right-[-10px] top-1/2 w-0 h-0"
            style={{
              marginTop: -6,
              borderTop: "6px solid transparent",
              borderLeft: "12px solid #f97316",
              borderBottom: "6px solid transparent",
            }}
          />
          {/* Wing */}
          <div className="absolute left-1 top-3 w-4 h-3 bg-yellow-500 border-2 border-black rounded" />
        </div>

        {/* Menu overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-5xl mb-4">🐦</div>
              <h2 className="text-2xl font-black mb-2">READY?</h2>
              <p className="font-bold mb-4 text-gray-600">Tap or Press Space to Flap!</p>
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
                {score > 0 && score >= highScore ? "🎉 NEW HIGH SCORE!" : `Best: ${highScore}`}
              </p>
              <div className="bg-cyan-400 border-4 border-black px-6 py-3 font-black text-xl">
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
