"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";

interface Pipe {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

const GAME_WIDTH = 450;
const GAME_HEIGHT = 650;
const BIRD_SIZE = 40;
const BIRD_X = 80;
const PIPE_WIDTH = 60;
const BASE_PIPE_GAP = 160;
const MIN_PIPE_GAP = 120;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const BASE_PIPE_SPEED = 4;
const MAX_PIPE_SPEED = 7;

function getMedal(score: number): { emoji: string; name: string; color: string } | null {
  if (score >= 40) return { emoji: "🏆", name: "PLATINUM", color: "bg-purple-400" };
  if (score >= 30) return { emoji: "🥇", name: "GOLD", color: "bg-yellow-400" };
  if (score >= 20) return { emoji: "🥈", name: "SILVER", color: "bg-gray-300" };
  if (score >= 10) return { emoji: "🥉", name: "BRONZE", color: "bg-orange-400" };
  return null;
}

function useSound() {
  const playSound = useCallback((type: "jump" | "score" | "hit" | "medal") => {
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
        case "medal":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
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
  const [countdown, setCountdown] = useState(3);
  const [wingUp, setWingUp] = useState(false);
  const [groundOffset, setGroundOffset] = useState(0);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [isDying, setIsDying] = useState(false);

  // Use refs for game loop values
  const birdYRef = useRef(GAME_HEIGHT / 2);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>("menu");
  const lastPipeSpawnRef = useRef(0);
  const pipeIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const wingFrameRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const cloudOffsetRef = useRef(0);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const trailIdRef = useRef(0);
  const popupIdRef = useRef(0);

  const { playSound } = useSound();

  // Calculate difficulty based on score
  const getPipeSpeed = useCallback((currentScore: number) => {
    return Math.min(BASE_PIPE_SPEED + currentScore * 0.1, MAX_PIPE_SPEED);
  }, []);

  const getPipeGap = useCallback((currentScore: number) => {
    return Math.max(BASE_PIPE_GAP - currentScore * 1.5, MIN_PIPE_GAP);
  }, []);

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("flappyHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    setGameState("countdown");
    gameStateRef.current = "countdown";

    // Reset game state
    birdYRef.current = GAME_HEIGHT / 2;
    birdVelocityRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    pipeIdRef.current = 0;
    scorePopupsRef.current = [];
    trailParticlesRef.current = [];

    setBirdY(GAME_HEIGHT / 2);
    setBirdRotation(0);
    setPipes([]);
    setScore(0);
    setScorePopups([]);
    setTrailParticles([]);
    setIsDying(false);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      lastPipeSpawnRef.current = Date.now();
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [gameState, countdown]);

  const jump = useCallback(() => {
    if (gameStateRef.current === "playing") {
      birdVelocityRef.current = JUMP_FORCE;
      if (soundEnabled) playSound("jump");
    } else if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
      startCountdown();
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [soundEnabled, playSound, startCountdown]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === "playing") {
      setGameState("paused");
      gameStateRef.current = "paused";
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, []);

  const endGame = useCallback(() => {
    if (gameStateRef.current !== "playing") return;

    setIsDying(true);
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    if (soundEnabled) playSound("hit");

    // Death animation - let bird fall
    setTimeout(() => {
      setGameState("gameover");
      gameStateRef.current = "gameover";
      setIsDying(false);

      // Check for medal
      const medal = getMedal(scoreRef.current);
      if (medal && soundEnabled) {
        setTimeout(() => playSound("medal"), 300);
      }

      // Update high score
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem("flappyHighScore", scoreRef.current.toString());
      }
    }, 500);
  }, [soundEnabled, playSound, highScore]);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") return;

    const gameLoop = () => {
      const currentState = gameStateRef.current;

      // Always animate ground and clouds
      groundOffsetRef.current = (groundOffsetRef.current + 3) % 48;
      cloudOffsetRef.current = (cloudOffsetRef.current + 0.5) % GAME_WIDTH;
      setGroundOffset(groundOffsetRef.current);
      setCloudOffset(cloudOffsetRef.current);

      // Wing animation
      wingFrameRef.current++;
      if (wingFrameRef.current % 8 === 0) {
        setWingUp((prev) => !prev);
      }

      if (currentState === "countdown") {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (currentState !== "playing") return;

      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current += birdVelocityRef.current;

      // Add trail particles
      if (wingFrameRef.current % 4 === 0) {
        trailParticlesRef.current.push({
          id: trailIdRef.current++,
          x: BIRD_X,
          y: birdYRef.current + BIRD_SIZE / 2,
          opacity: 0.6,
        });
      }

      // Update trail particles
      trailParticlesRef.current = trailParticlesRef.current
        .map((p) => ({ ...p, x: p.x - 2, opacity: p.opacity - 0.05 }))
        .filter((p) => p.opacity > 0);
      setTrailParticles([...trailParticlesRef.current]);

      // Check boundaries
      if (birdYRef.current < 0) {
        birdYRef.current = 0;
        birdVelocityRef.current = 0;
      }

      if (birdYRef.current > GAME_HEIGHT - BIRD_SIZE - 24) {
        endGame();
        return;
      }

      // Spawn pipes
      const now = Date.now();
      const spawnInterval = Math.max(1600 - scoreRef.current * 20, 1200);
      if (now - lastPipeSpawnRef.current > spawnInterval) {
        lastPipeSpawnRef.current = now;
        const currentGap = getPipeGap(scoreRef.current);
        const gapY = Math.random() * (GAME_HEIGHT - currentGap - 150) + 75;
        pipesRef.current.push({
          id: pipeIdRef.current++,
          x: GAME_WIDTH,
          gapY,
          passed: false,
        });
      }

      // Update pipes and check collisions
      const birdLeft = BIRD_X + 5;
      const birdRight = BIRD_X + BIRD_SIZE - 5;
      const birdTop = birdYRef.current + 5;
      const birdBottom = birdYRef.current + BIRD_SIZE - 5;
      const currentSpeed = getPipeSpeed(scoreRef.current);
      const currentGap = getPipeGap(scoreRef.current);

      pipesRef.current = pipesRef.current
        .map((pipe) => {
          pipe.x -= currentSpeed;

          // Check collision
          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + PIPE_WIDTH;
          const gapTop = pipe.gapY;
          const gapBottom = pipe.gapY + currentGap;

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

            // Add score popup
            scorePopupsRef.current.push({
              id: popupIdRef.current++,
              x: BIRD_X + BIRD_SIZE,
              y: birdYRef.current,
              opacity: 1,
            });
          }

          return pipe;
        })
        .filter((pipe) => pipe.x > -PIPE_WIDTH);

      // Update score popups
      scorePopupsRef.current = scorePopupsRef.current
        .map((p) => ({ ...p, y: p.y - 2, opacity: p.opacity - 0.03 }))
        .filter((p) => p.opacity > 0);
      setScorePopups([...scorePopupsRef.current]);

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
  }, [gameState, endGame, soundEnabled, playSound, getPipeSpeed, getPipeGap]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      } else if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        if (gameStateRef.current === "playing" || gameStateRef.current === "paused") {
          togglePause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jump, togglePause]);

  const medal = getMedal(score);
  const currentGap = getPipeGap(score);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top bar */}
      <div className="w-full flex justify-between items-center mb-4 px-4">
        <button
          onClick={onBack}
          className="px-3 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-sm
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          ← Back
        </button>

        <div className="flex gap-2">
          {(gameState === "playing" || gameState === "paused") && (
            <button
              onClick={togglePause}
              className="w-10 h-10 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg
                hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
            >
              {gameState === "paused" ? "▶" : "⏸"}
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg
              hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-lime-400 border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3 rotate-1">
        <h1 className="text-2xl sm:text-4xl font-black text-black">FLAPPY BIRD</h1>
      </div>

      {/* Score display */}
      <div className="flex gap-2 mb-3">
        <div className="px-3 py-1 bg-yellow-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">SCORE</div>
          <div className="text-xl font-black">{score}</div>
        </div>
        <div className="px-3 py-1 bg-orange-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">BEST</div>
          <div className="text-xl font-black">{highScore}</div>
        </div>
        {gameState === "playing" && (
          <div className="px-3 py-1 bg-cyan-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-bold">SPEED</div>
            <div className="text-xl font-black">{getPipeSpeed(score).toFixed(1)}x</div>
          </div>
        )}
      </div>

      {/* Game area */}
      <div
        className={`relative bg-gradient-to-b from-cyan-300 to-cyan-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer select-none
          ${screenShake ? "animate-shake" : ""}`}
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          transform: screenShake ? `translate(${Math.random() * 8 - 4}px, ${Math.random() * 8 - 4}px)` : undefined,
        }}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      >
        {/* Parallax clouds */}
        <div
          className="absolute top-10 w-16 h-8 bg-white border-2 border-black rounded-full opacity-80"
          style={{ left: (50 - cloudOffset) % GAME_WIDTH }}
        />
        <div
          className="absolute top-24 w-20 h-10 bg-white border-2 border-black rounded-full opacity-80"
          style={{ left: (200 - cloudOffset * 0.8) % GAME_WIDTH }}
        />
        <div
          className="absolute top-40 w-14 h-7 bg-white border-2 border-black rounded-full opacity-80"
          style={{ left: (320 - cloudOffset * 0.6) % GAME_WIDTH }}
        />
        <div
          className="absolute top-56 w-18 h-9 bg-white border-2 border-black rounded-full opacity-80"
          style={{ left: (100 - cloudOffset * 0.7) % GAME_WIDTH }}
        />

        {/* Scrolling ground */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
          <div
            className="absolute bottom-0 h-24 flex"
            style={{
              left: -groundOffset,
              width: GAME_WIDTH + 96,
            }}
          >
            {Array.from({ length: Math.ceil(GAME_WIDTH / 48) + 2 }).map((_, i) => (
              <div key={i} className="w-12 h-24 flex flex-col">
                <div className="h-4 bg-lime-500 border-t-4 border-black" />
                <div className="flex-1 bg-amber-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Trail particles */}
        {trailParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              opacity: particle.opacity,
            }}
          />
        ))}

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
              <div className="absolute inset-x-2 inset-y-0 bg-lime-400 opacity-50" />
              <div
                className="absolute left-[-6px] bottom-0 bg-lime-600 border-4 border-black"
                style={{ width: PIPE_WIDTH + 12, height: 28 }}
              />
            </div>

            {/* Bottom pipe */}
            <div
              className="absolute bg-lime-500 border-4 border-black"
              style={{
                left: pipe.x,
                top: pipe.gapY + currentGap,
                width: PIPE_WIDTH,
                height: GAME_HEIGHT - pipe.gapY - currentGap - 24,
              }}
            >
              <div className="absolute inset-x-2 inset-y-0 bg-lime-400 opacity-50" />
              <div
                className="absolute left-[-6px] top-0 bg-lime-600 border-4 border-black"
                style={{ width: PIPE_WIDTH + 12, height: 28 }}
              />
            </div>
          </div>
        ))}

        {/* Score popups */}
        {scorePopups.map((popup) => (
          <div
            key={popup.id}
            className="absolute font-black text-2xl text-yellow-400 pointer-events-none"
            style={{
              left: popup.x,
              top: popup.y,
              opacity: popup.opacity,
              textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
            }}
          >
            +1
          </div>
        ))}

        {/* Bird */}
        <div
          className={`absolute bg-yellow-400 border-4 border-black rounded-lg transition-transform duration-75
            ${isDying ? "animate-spin" : ""}`}
          style={{
            left: BIRD_X,
            top: birdY,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            transform: `rotate(${isDying ? 180 : birdRotation}deg)`,
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
          {/* Animated Wing */}
          <div
            className="absolute left-1 w-4 h-3 bg-yellow-500 border-2 border-black rounded transition-all duration-75"
            style={{
              top: wingUp ? 2 : 5,
              transform: `rotate(${wingUp ? -20 : 20}deg)`,
            }}
          />
        </div>

        {/* Menu overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="text-5xl mb-4">🐦</div>
              <h2 className="text-2xl font-black mb-2">READY?</h2>
              <p className="font-bold mb-4 text-gray-600">Tap or Press Space to Flap!</p>
              <p className="text-sm font-bold mb-4 text-gray-500">Press P or ESC to pause</p>
              <div className="bg-lime-400 border-4 border-black px-6 py-3 font-black text-xl">
                TAP TO START
              </div>
            </div>
          </div>
        )}

        {/* Countdown overlay */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
            <div className="text-8xl font-black text-white animate-pulse"
              style={{ textShadow: "4px 4px 0 #000" }}>
              {countdown === 0 ? "GO!" : countdown}
            </div>
          </div>
        )}

        {/* Paused overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <h2 className="text-3xl font-black mb-4">PAUSED</h2>
              <p className="font-bold text-gray-600 mb-4">Press SPACE or tap to continue</p>
              <div className="bg-cyan-400 border-4 border-black px-6 py-3 font-black text-xl">
                TAP TO RESUME
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

              {medal && (
                <div className={`${medal.color} border-4 border-black px-4 py-2 mb-3 inline-block`}>
                  <span className="text-3xl mr-2">{medal.emoji}</span>
                  <span className="font-black">{medal.name}</span>
                </div>
              )}

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
      <div className="mt-3 px-3 py-1.5 bg-white border-4 border-black font-bold text-xs text-center">
        <span className="hidden sm:inline">SPACE to flap • P to pause • Difficulty increases!</span>
        <span className="sm:hidden">Tap to flap • Gets harder!</span>
      </div>

      {/* Medal guide */}
      <div className="mt-2 flex gap-1 flex-wrap justify-center">
        <div className="px-2 py-0.5 bg-orange-400 border-2 border-black text-xs font-bold">🥉 10+</div>
        <div className="px-2 py-0.5 bg-gray-300 border-2 border-black text-xs font-bold">🥈 20+</div>
        <div className="px-2 py-0.5 bg-yellow-400 border-2 border-black text-xs font-bold">🥇 30+</div>
        <div className="px-2 py-0.5 bg-purple-400 border-2 border-black text-xs font-bold">🏆 40+</div>
      </div>
    </div>
  );
}
