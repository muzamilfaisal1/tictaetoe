"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type FoodType = "normal" | "golden" | "speed" | "ghost" | "magnet";
type SnakeSkin = "classic" | "rainbow" | "fire" | "ice" | "neon" | "galaxy";

interface Position {
  x: number;
  y: number;
}

interface Food {
  position: Position;
  type: FoodType;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  life: number;
  color: string;
}

const GRID_SIZE = 20;
const CELL_SIZE = 22;
const INITIAL_SPEED = 150;
const MIN_SPEED = 50;
const SPEED_INCREMENT = 4;

const SKINS: Record<SnakeSkin, { name: string; emoji: string; colors: string[]; glow?: string }> = {
  classic: { name: "Classic", emoji: "🐍", colors: ["#22c55e", "#16a34a", "#15803d"], glow: "#22c55e" },
  rainbow: { name: "Rainbow", emoji: "🌈", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"], glow: "#fff" },
  fire: { name: "Fire", emoji: "🔥", colors: ["#ef4444", "#f97316", "#eab308"], glow: "#f97316" },
  ice: { name: "Ice", emoji: "❄️", colors: ["#06b6d4", "#0ea5e9", "#3b82f6"], glow: "#06b6d4" },
  neon: { name: "Neon", emoji: "💜", colors: ["#d946ef", "#a855f7", "#ec4899"], glow: "#d946ef" },
  galaxy: { name: "Galaxy", emoji: "🌌", colors: ["#1e1b4b", "#312e81", "#4338ca"], glow: "#818cf8" },
};

interface WarpEffect {
  id: number;
  side: "left" | "right" | "top" | "bottom";
  position: number;
  life: number;
}

function useSound() {
  const playSound = useCallback((type: "eat" | "bonus" | "die" | "powerup" | "highscore" | "warp") => {
    if (typeof window === "undefined") return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case "eat":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.05);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.1);
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case "bonus":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.2);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case "die":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.4);
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
        case "powerup":
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(450, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
          oscillator.type = "triangle";
          gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
        case "highscore":
          const osc1 = audioContext.createOscillator();
          const osc2 = audioContext.createOscillator();
          const gain1 = audioContext.createGain();
          osc1.connect(gain1);
          osc2.connect(gain1);
          gain1.connect(audioContext.destination);
          osc1.frequency.setValueAtTime(523, audioContext.currentTime);
          osc1.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
          osc1.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
          osc1.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
          osc2.frequency.setValueAtTime(659, audioContext.currentTime);
          osc2.frequency.setValueAtTime(784, audioContext.currentTime + 0.15);
          osc2.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3);
          osc2.frequency.setValueAtTime(1318, audioContext.currentTime + 0.45);
          osc1.type = "sine";
          osc2.type = "sine";
          gain1.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          osc1.start();
          osc2.start();
          osc1.stop(audioContext.currentTime + 0.6);
          osc2.stop(audioContext.currentTime + 0.6);
          break;
        case "warp":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
      }
    } catch (e) {
      // Audio not supported
    }
  }, []);
  return { playSound };
}

function getRandomPosition(snake: Position[], exclude?: Position[]): Position {
  let position: Position;
  let attempts = 0;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    attempts++;
  } while (
    (snake.some((segment) => segment.x === position.x && segment.y === position.y) ||
    exclude?.some((pos) => pos.x === position.x && pos.y === position.y)) &&
    attempts < 100
  );
  return position;
}

function getRandomFoodType(score: number): FoodType {
  const rand = Math.random();
  if (score >= 100 && rand < 0.05) return "magnet";
  if (score >= 70 && rand < 0.08) return "ghost";
  if (score >= 50 && rand < 0.12) return "speed";
  if (score >= 30 && rand < 0.18) return "golden";
  return "normal";
}

export default function Snake({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Food>({ position: { x: 15, y: 10 }, type: "normal" });
  const [bonusFood, setBonusFood] = useState<Food | null>(null);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [combo, setCombo] = useState(0);
  const [lastEatTime, setLastEatTime] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [controlMode, setControlMode] = useState<"swipe" | "buttons">("buttons");
  const [skin, setSkin] = useState<SnakeSkin>("classic");
  const [wrapMode, setWrapMode] = useState(false);
  const [isGhost, setIsGhost] = useState(false);
  const [isMagnet, setIsMagnet] = useState(false);
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [showNewHighScore, setShowNewHighScore] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [warpEffects, setWarpEffects] = useState<WarpEffect[]>([]);
  const [wrapCount, setWrapCount] = useState(0);
  const [lastWrapTime, setLastWrapTime] = useState(0);

  const directionRef = useRef<Direction>("RIGHT");
  const nextDirectionRef = useRef<Direction>("RIGHT");
  const gameStateRef = useRef<GameState>("menu");
  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Food>({ position: { x: 15, y: 10 }, type: "normal" });
  const bonusFoodRef = useRef<Food | null>(null);
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const particleIdRef = useRef(0);
  const comboRef = useRef(0);
  const lastEatTimeRef = useRef(0);
  const isGhostRef = useRef(false);
  const isMagnetRef = useRef(false);
  const highScoreRef = useRef(0);
  const warpEffectsRef = useRef<WarpEffect[]>([]);
  const warpIdRef = useRef(0);
  const wrapCountRef = useRef(0);

  const { playSound } = useSound();

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    isGhostRef.current = isGhost;
  }, [isGhost]);

  useEffect(() => {
    isMagnetRef.current = isMagnet;
  }, [isMagnet]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  // Load high score and skin
  useEffect(() => {
    const savedScore = localStorage.getItem("snakeHighScore");
    if (savedScore) {
      setHighScore(parseInt(savedScore));
      highScoreRef.current = parseInt(savedScore);
    }
    const savedSkin = localStorage.getItem("snakeSkin");
    if (savedSkin && savedSkin in SKINS) setSkin(savedSkin as SnakeSkin);
    const savedWrap = localStorage.getItem("snakeWrapMode");
    if (savedWrap) setWrapMode(savedWrap === "true");
  }, []);

  // Save skin preference
  useEffect(() => {
    localStorage.setItem("snakeSkin", skin);
  }, [skin]);

  useEffect(() => {
    localStorage.setItem("snakeWrapMode", String(wrapMode));
  }, [wrapMode]);

  // Animation frame counter for effects
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") return;
    const interval = setInterval(() => {
      setFrameCount((f) => f + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [gameState]);

  // Bonus food spawner
  useEffect(() => {
    if (gameState !== "playing") return;

    const spawnBonus = () => {
      if (scoreRef.current >= 20 && !bonusFoodRef.current && Math.random() < 0.35) {
        const pos = getRandomPosition(snakeRef.current, [foodRef.current.position]);
        const types: FoodType[] = ["golden", "speed"];
        if (scoreRef.current >= 50) types.push("ghost");
        if (scoreRef.current >= 80) types.push("magnet");
        const bonus: Food = {
          position: pos,
          type: types[Math.floor(Math.random() * types.length)],
        };
        bonusFoodRef.current = bonus;
        setBonusFood(bonus);

        setTimeout(() => {
          bonusFoodRef.current = null;
          setBonusFood(null);
        }, 6000);
      }
    };

    const interval = setInterval(spawnBonus, 7000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Particle animation
  useEffect(() => {
    if (particles.length === 0 && trailParticles.length === 0 && confetti.length === 0 && warpEffects.length === 0) return;

    const animate = () => {
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 3,
        }))
        .filter((p) => p.life > 0);
      setParticles([...particlesRef.current]);

      trailParticlesRef.current = trailParticlesRef.current
        .map((p) => ({ ...p, life: p.life - 4 }))
        .filter((p) => p.life > 0);
      setTrailParticles([...trailParticlesRef.current]);

      warpEffectsRef.current = warpEffectsRef.current
        .map((w) => ({ ...w, life: w.life - 5 }))
        .filter((w) => w.life > 0);
      setWarpEffects([...warpEffectsRef.current]);

      setConfetti((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1,
            life: p.life - 1,
          }))
          .filter((p) => p.life > 0)
      );
    };

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [particles, trailParticles, confetti, warpEffects]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 3,
        life: 100,
        color,
        size: Math.random() * 4 + 2,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    setParticles([...particlesRef.current]);
  }, []);

  const spawnConfetti = useCallback(() => {
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
    const newConfetti: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        id: particleIdRef.current++,
        x: Math.random() * GRID_SIZE * CELL_SIZE,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        life: 150,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
      });
    }
    setConfetti(newConfetti);
  }, []);

  const addTrailParticle = useCallback((x: number, y: number, color: string) => {
    trailParticlesRef.current.push({
      id: particleIdRef.current++,
      x: x * CELL_SIZE + CELL_SIZE / 2,
      y: y * CELL_SIZE + CELL_SIZE / 2,
      life: 60,
      color,
    });
    if (trailParticlesRef.current.length > 50) {
      trailParticlesRef.current = trailParticlesRef.current.slice(-50);
    }
    setTrailParticles([...trailParticlesRef.current]);
  }, []);

  const triggerScreenFlash = useCallback((color: string) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 100);
  }, []);

  const triggerWarpEffect = useCallback((side: "left" | "right" | "top" | "bottom", position: number, exitSide: "left" | "right" | "top" | "bottom", exitPosition: number) => {
    // Entry warp effect
    warpEffectsRef.current.push({
      id: warpIdRef.current++,
      side,
      position,
      life: 100,
    });
    // Exit warp effect
    warpEffectsRef.current.push({
      id: warpIdRef.current++,
      side: exitSide,
      position: exitPosition,
      life: 100,
    });
    setWarpEffects([...warpEffectsRef.current]);

    // Spawn particles at entry and exit points
    const skinColors = SKINS[skin].colors;
    const entryX = side === "left" ? 0 : side === "right" ? GRID_SIZE - 1 : position;
    const entryY = side === "top" ? 0 : side === "bottom" ? GRID_SIZE - 1 : position;
    const exitX = exitSide === "left" ? 0 : exitSide === "right" ? GRID_SIZE - 1 : exitPosition;
    const exitY = exitSide === "top" ? 0 : exitSide === "bottom" ? GRID_SIZE - 1 : exitPosition;

    spawnParticles(entryX, entryY, skinColors[0], 8);
    spawnParticles(exitX, exitY, skinColors[0], 8);

    wrapCountRef.current++;
    setWrapCount(wrapCountRef.current);
    setLastWrapTime(Date.now());
  }, [skin, spawnParticles]);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood: Food = { position: getRandomPosition(initialSnake), type: "normal" };

    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    bonusFoodRef.current = null;
    directionRef.current = "RIGHT";
    nextDirectionRef.current = "RIGHT";
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    comboRef.current = 0;
    lastEatTimeRef.current = 0;
    particlesRef.current = [];
    trailParticlesRef.current = [];
    isGhostRef.current = false;
    isMagnetRef.current = false;

    setSnake(initialSnake);
    setFood(initialFood);
    setBonusFood(null);
    setDirection("RIGHT");
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setParticles([]);
    setTrailParticles([]);
    setCombo(0);
    setShowCombo(false);
    setIsGhost(false);
    setIsMagnet(false);
    setConfetti([]);
    setShowNewHighScore(false);
    warpEffectsRef.current = [];
    wrapCountRef.current = 0;
    setWarpEffects([]);
    setWrapCount(0);
  }, []);

  const startCountdown = useCallback(() => {
    resetGame();
    setCountdown(3);
    setGameState("countdown");
    gameStateRef.current = "countdown";
  }, [resetGame]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [gameState, countdown]);

  const endGame = useCallback(() => {
    if (gameStateRef.current !== "playing") return;

    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
    triggerScreenFlash("#ef4444");

    // Death explosion
    snakeRef.current.forEach((segment, i) => {
      setTimeout(() => {
        spawnParticles(segment.x, segment.y, SKINS[skin].colors[0], 5);
      }, i * 30);
    });

    if (soundEnabled) playSound("die");

    const isNewHighScore = scoreRef.current > highScoreRef.current;
    if (isNewHighScore) {
      setHighScore(scoreRef.current);
      highScoreRef.current = scoreRef.current;
      localStorage.setItem("snakeHighScore", scoreRef.current.toString());
      setShowNewHighScore(true);
      spawnConfetti();
      if (soundEnabled) setTimeout(() => playSound("highscore"), 300);
    }

    setTimeout(() => {
      setGameState("gameover");
      gameStateRef.current = "gameover";
    }, 300);
  }, [soundEnabled, playSound, spawnParticles, spawnConfetti, triggerScreenFlash, skin]);

  // Magnet effect - move food toward snake
  useEffect(() => {
    if (!isMagnet || gameState !== "playing") return;

    const magnetInterval = setInterval(() => {
      const head = snakeRef.current[0];
      const food = foodRef.current;
      const dx = head.x - food.position.x;
      const dy = head.y - food.position.y;

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        const newX = food.position.x + Math.sign(dx);
        const newY = food.position.y + Math.sign(dy);

        if (!snakeRef.current.some((s) => s.x === newX && s.y === newY)) {
          foodRef.current = { ...food, position: { x: newX, y: newY } };
          setFood(foodRef.current);
        }
      }
    }, 200);

    return () => clearInterval(magnetInterval);
  }, [isMagnet, gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      if (gameStateRef.current !== "playing") return;

      directionRef.current = nextDirectionRef.current;

      const head = snakeRef.current[0];
      let newHead: Position;

      switch (directionRef.current) {
        case "UP":
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case "DOWN":
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case "LEFT":
          newHead = { x: head.x - 1, y: head.y };
          break;
        case "RIGHT":
          newHead = { x: head.x + 1, y: head.y };
          break;
      }

      // Wrap mode
      if (wrapMode) {
        let didWrap = false;
        let entrySide: "left" | "right" | "top" | "bottom" = "left";
        let exitSide: "left" | "right" | "top" | "bottom" = "right";
        let entryPos = head.y;
        let exitPos = head.y;

        if (newHead.x < 0) {
          newHead.x = GRID_SIZE - 1;
          didWrap = true;
          entrySide = "left";
          exitSide = "right";
          entryPos = head.y;
          exitPos = head.y;
        }
        if (newHead.x >= GRID_SIZE) {
          newHead.x = 0;
          didWrap = true;
          entrySide = "right";
          exitSide = "left";
          entryPos = head.y;
          exitPos = head.y;
        }
        if (newHead.y < 0) {
          newHead.y = GRID_SIZE - 1;
          didWrap = true;
          entrySide = "top";
          exitSide = "bottom";
          entryPos = head.x;
          exitPos = head.x;
        }
        if (newHead.y >= GRID_SIZE) {
          newHead.y = 0;
          didWrap = true;
          entrySide = "bottom";
          exitSide = "top";
          entryPos = head.x;
          exitPos = head.x;
        }

        if (didWrap) {
          triggerWarpEffect(entrySide, entryPos, exitSide, exitPos);
          triggerScreenFlash("#06b6d450");
          if (soundEnabled) playSound("warp");
        }
      } else {
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          endGame();
          return;
        }
      }

      // Add trail particle
      const skinColors = SKINS[skin].colors;
      addTrailParticle(head.x, head.y, skinColors[0]);

      const eatsFood = newHead.x === foodRef.current.position.x && newHead.y === foodRef.current.position.y;
      const eatsBonus = bonusFoodRef.current &&
        newHead.x === bonusFoodRef.current.position.x &&
        newHead.y === bonusFoodRef.current.position.y;

      // Self collision (skip if ghost mode)
      if (!isGhostRef.current) {
        const bodyToCheck = (eatsFood || eatsBonus) ? snakeRef.current : snakeRef.current.slice(0, -1);
        if (bodyToCheck.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          endGame();
          return;
        }
      }

      const newSnake = [newHead, ...snakeRef.current];

      const now = Date.now();
      if (eatsFood || eatsBonus) {
        let points = 10;
        let particleColor = skinColors[0];
        let flashColor: string | null = null;

        if (eatsBonus && bonusFoodRef.current) {
          const bonusType = bonusFoodRef.current.type;
          if (bonusType === "golden") {
            points = 50;
            particleColor = "#eab308";
            flashColor = "#eab30830";
            if (soundEnabled) playSound("bonus");
          } else if (bonusType === "speed") {
            points = 30;
            particleColor = "#3b82f6";
            flashColor = "#3b82f630";
            if (soundEnabled) playSound("powerup");
          } else if (bonusType === "ghost") {
            points = 40;
            particleColor = "#a855f7";
            flashColor = "#a855f730";
            setIsGhost(true);
            isGhostRef.current = true;
            setTimeout(() => {
              setIsGhost(false);
              isGhostRef.current = false;
            }, 5000);
            if (soundEnabled) playSound("powerup");
          } else if (bonusType === "magnet") {
            points = 35;
            particleColor = "#ec4899";
            flashColor = "#ec489930";
            setIsMagnet(true);
            isMagnetRef.current = true;
            setTimeout(() => {
              setIsMagnet(false);
              isMagnetRef.current = false;
            }, 8000);
            if (soundEnabled) playSound("powerup");
          }
          bonusFoodRef.current = null;
          setBonusFood(null);
        } else {
          if (soundEnabled) playSound("eat");
          flashColor = "#22c55e20";
        }

        if (flashColor) triggerScreenFlash(flashColor);

        // Combo
        if (now - lastEatTimeRef.current < 3000) {
          comboRef.current = Math.min(comboRef.current + 1, 5);
          points = Math.floor(points * (1 + comboRef.current * 0.25));
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 500);
        } else {
          comboRef.current = 0;
        }
        lastEatTimeRef.current = now;
        setCombo(comboRef.current);
        setLastEatTime(now);

        scoreRef.current += points;
        setScore(scoreRef.current);

        const eatPos = eatsBonus ? (bonusFoodRef.current?.position || foodRef.current.position) : foodRef.current.position;
        spawnParticles(eatPos.x, eatPos.y, particleColor, 15);

        if (eatsFood) {
          const newFoodPos = getRandomPosition(newSnake, bonusFoodRef.current ? [bonusFoodRef.current.position] : []);
          foodRef.current = { position: newFoodPos, type: getRandomFoodType(scoreRef.current) };
          setFood(foodRef.current);
        }

        speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
        setSpeed(speedRef.current);

        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
          gameLoopRef.current = setInterval(gameLoop, speedRef.current);
        }
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake([...newSnake]);
      setDirection(directionRef.current);
    };

    gameLoopRef.current = setInterval(gameLoop, speedRef.current);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, endGame, soundEnabled, playSound, spawnParticles, addTrailParticle, wrapMode, skin, triggerScreenFlash, triggerWarpEffect]);

  const changeDirection = useCallback((newDirection: Direction) => {
    const current = directionRef.current;
    if (
      (current === "UP" && newDirection === "DOWN") ||
      (current === "DOWN" && newDirection === "UP") ||
      (current === "LEFT" && newDirection === "RIGHT") ||
      (current === "RIGHT" && newDirection === "LEFT")
    ) {
      return;
    }
    nextDirectionRef.current = newDirection;
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === "playing") {
      setGameState("paused");
      gameStateRef.current = "paused";
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, []);

  const handleAction = useCallback(() => {
    if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
      startCountdown();
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [startCountdown]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === "playing") {
        switch (e.code) {
          case "ArrowUp":
          case "KeyW":
            e.preventDefault();
            changeDirection("UP");
            break;
          case "ArrowDown":
          case "KeyS":
            e.preventDefault();
            changeDirection("DOWN");
            break;
          case "ArrowLeft":
          case "KeyA":
            e.preventDefault();
            changeDirection("LEFT");
            break;
          case "ArrowRight":
          case "KeyD":
            e.preventDefault();
            changeDirection("RIGHT");
            break;
          case "Escape":
          case "KeyP":
            e.preventDefault();
            togglePause();
            break;
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        handleAction();
      } else if ((e.code === "Escape" || e.code === "KeyP") && gameStateRef.current === "paused") {
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, togglePause, handleAction]);

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (controlMode === "swipe") {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [controlMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (controlMode !== "swipe" || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > minSwipe) changeDirection("RIGHT");
      else if (deltaX < -minSwipe) changeDirection("LEFT");
    } else {
      if (deltaY > minSwipe) changeDirection("DOWN");
      else if (deltaY < -minSwipe) changeDirection("UP");
    }
    touchStartRef.current = null;
  }, [controlMode, changeDirection]);

  const getSegmentColor = (index: number) => {
    const skinData = SKINS[skin];
    if (skin === "rainbow") {
      const hue = ((frameCount * 5) + (index * 30)) % 360;
      return `hsl(${hue}, 80%, 55%)`;
    }
    return skinData.colors[index % skinData.colors.length];
  };

  const speedPercentage = Math.round(((INITIAL_SPEED - speed) / (INITIAL_SPEED - MIN_SPEED)) * 100);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top bar */}
      <div className="w-full flex justify-between items-center mb-3 px-4">
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
      <div className="bg-emerald-400 border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3 -rotate-1">
        <h1 className="text-2xl sm:text-4xl font-black text-black">SNAKE</h1>
      </div>

      {/* Score display */}
      <div className="flex gap-2 mb-3 flex-wrap justify-center">
        <div className="px-3 py-1 bg-yellow-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">SCORE</div>
          <div className="text-xl font-black">{score}</div>
        </div>
        <div className="px-3 py-1 bg-orange-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">BEST</div>
          <div className="text-xl font-black">{highScore}</div>
        </div>
        <div className="px-3 py-1 bg-emerald-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-bold">LENGTH</div>
          <div className="text-xl font-black">{snake.length}</div>
        </div>
        {combo > 0 && (
          <div className={`px-3 py-1 bg-purple-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${showCombo ? "scale-110" : ""} transition-transform`}>
            <div className="text-xs font-bold">COMBO</div>
            <div className="text-xl font-black">x{combo + 1}</div>
          </div>
        )}
        {wrapMode && wrapCount > 0 && (
          <div className={`px-3 py-1 bg-cyan-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${Date.now() - lastWrapTime < 500 ? "scale-110" : ""} transition-transform`}>
            <div className="text-xs font-bold">WARPS</div>
            <div className="text-xl font-black">🌀 {wrapCount}</div>
          </div>
        )}
      </div>

      {/* Power-up indicators */}
      {(isGhost || isMagnet || wrapMode) && (gameState === "playing" || gameState === "paused") && (
        <div className="flex gap-2 mb-2 flex-wrap justify-center">
          {wrapMode && (
            <div className="px-3 py-1 bg-cyan-500 border-2 border-black text-white font-bold text-xs">
              🌀 WRAP MODE
            </div>
          )}
          {isGhost && (
            <div className="px-3 py-1 bg-purple-500 border-2 border-black text-white font-bold text-xs animate-pulse">
              👻 GHOST MODE
            </div>
          )}
          {isMagnet && (
            <div className="px-3 py-1 bg-pink-500 border-2 border-black text-white font-bold text-xs animate-pulse">
              🧲 MAGNET
            </div>
          )}
        </div>
      )}

      {/* Speed bar */}
      {gameState === "playing" && (
        <div className="w-full max-w-[400px] px-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">⚡</span>
            <div className="flex-1 h-2 bg-gray-300 border-2 border-black overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${speedPercentage}%`,
                  background: `linear-gradient(90deg, ${SKINS[skin].colors.join(", ")})`,
                }}
              />
            </div>
            <span className="text-xs font-bold">{speedPercentage}%</span>
          </div>
        </div>
      )}

      {/* Game area */}
      <div
        className={`relative border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-75`}
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
          transform: screenShake ? `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)` : undefined,
          background: skin === "galaxy" ? "#0f0a1f" : "#111827",
          boxShadow: isGhost
            ? `8px 8px 0px 0px rgba(0,0,0,1), 0 0 20px ${SKINS[skin].glow}50`
            : isMagnet
            ? `8px 8px 0px 0px rgba(0,0,0,1), 0 0 20px #ec489950`
            : "8px 8px 0px 0px rgba(0,0,0,1)",
        }}
        onClick={() => controlMode === "swipe" && handleAction()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Screen flash */}
        {screenFlash && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{ backgroundColor: screenFlash }}
          />
        )}

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Portal edges when wrap mode is on */}
        {wrapMode && (gameState === "playing" || gameState === "countdown") && (
          <>
            {/* Left portal */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent, ${SKINS[skin].glow}, transparent)`,
                boxShadow: `0 0 ${10 + Math.sin(frameCount * 0.15) * 5}px ${SKINS[skin].glow}`,
                opacity: 0.6 + Math.sin(frameCount * 0.1) * 0.2,
              }}
            />
            {/* Right portal */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent, ${SKINS[skin].glow}, transparent)`,
                boxShadow: `0 0 ${10 + Math.sin(frameCount * 0.15) * 5}px ${SKINS[skin].glow}`,
                opacity: 0.6 + Math.sin(frameCount * 0.1) * 0.2,
              }}
            />
            {/* Top portal */}
            <div
              className="absolute left-0 right-0 top-0 h-1 pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent, ${SKINS[skin].glow}, transparent)`,
                boxShadow: `0 0 ${10 + Math.sin(frameCount * 0.15) * 5}px ${SKINS[skin].glow}`,
                opacity: 0.6 + Math.sin(frameCount * 0.1) * 0.2,
              }}
            />
            {/* Bottom portal */}
            <div
              className="absolute left-0 right-0 bottom-0 h-1 pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent, ${SKINS[skin].glow}, transparent)`,
                boxShadow: `0 0 ${10 + Math.sin(frameCount * 0.15) * 5}px ${SKINS[skin].glow}`,
                opacity: 0.6 + Math.sin(frameCount * 0.1) * 0.2,
              }}
            />
          </>
        )}

        {/* Warp effects */}
        {warpEffects.map((warp) => {
          const size = 30 + (100 - warp.life) * 0.5;
          const opacity = warp.life / 100;
          let x = 0, y = 0;

          if (warp.side === "left") {
            x = 0;
            y = warp.position * CELL_SIZE + CELL_SIZE / 2;
          } else if (warp.side === "right") {
            x = GRID_SIZE * CELL_SIZE;
            y = warp.position * CELL_SIZE + CELL_SIZE / 2;
          } else if (warp.side === "top") {
            x = warp.position * CELL_SIZE + CELL_SIZE / 2;
            y = 0;
          } else {
            x = warp.position * CELL_SIZE + CELL_SIZE / 2;
            y = GRID_SIZE * CELL_SIZE;
          }

          return (
            <div
              key={warp.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: x,
                top: y,
                width: size,
                height: size,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, ${SKINS[skin].glow}${Math.round(opacity * 80).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                boxShadow: `0 0 ${size / 2}px ${SKINS[skin].glow}`,
                opacity,
              }}
            />
          );
        })}

        {/* Ghost preview - shows where snake will appear on other side */}
        {wrapMode && gameState === "playing" && snake.length > 0 && (
          <>
            {/* Left edge - show ghost on right */}
            {snake[0].x === 0 && direction === "LEFT" && (
              <div
                className="absolute border-2 border-dashed rounded-lg pointer-events-none animate-pulse"
                style={{
                  left: (GRID_SIZE - 1) * CELL_SIZE,
                  top: snake[0].y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderColor: SKINS[skin].glow,
                  backgroundColor: `${SKINS[skin].colors[0]}30`,
                  opacity: 0.6,
                }}
              />
            )}
            {/* Right edge - show ghost on left */}
            {snake[0].x === GRID_SIZE - 1 && direction === "RIGHT" && (
              <div
                className="absolute border-2 border-dashed rounded-lg pointer-events-none animate-pulse"
                style={{
                  left: 0,
                  top: snake[0].y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderColor: SKINS[skin].glow,
                  backgroundColor: `${SKINS[skin].colors[0]}30`,
                  opacity: 0.6,
                }}
              />
            )}
            {/* Top edge - show ghost on bottom */}
            {snake[0].y === 0 && direction === "UP" && (
              <div
                className="absolute border-2 border-dashed rounded-lg pointer-events-none animate-pulse"
                style={{
                  left: snake[0].x * CELL_SIZE,
                  top: (GRID_SIZE - 1) * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderColor: SKINS[skin].glow,
                  backgroundColor: `${SKINS[skin].colors[0]}30`,
                  opacity: 0.6,
                }}
              />
            )}
            {/* Bottom edge - show ghost on top */}
            {snake[0].y === GRID_SIZE - 1 && direction === "DOWN" && (
              <div
                className="absolute border-2 border-dashed rounded-lg pointer-events-none animate-pulse"
                style={{
                  left: snake[0].x * CELL_SIZE,
                  top: 0,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderColor: SKINS[skin].glow,
                  backgroundColor: `${SKINS[skin].colors[0]}30`,
                  opacity: 0.6,
                }}
              />
            )}
          </>
        )}

        {/* Galaxy stars */}
        {skin === "galaxy" && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  opacity: 0.3 + Math.sin(frameCount * 0.1 + i) * 0.3,
                }}
              />
            ))}
          </div>
        )}

        {/* Confetti */}
        {confetti.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / 150,
              transform: `rotate(${p.life * 10}deg)`,
            }}
          />
        ))}

        {/* Trail particles */}
        {trailParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: 6,
              height: 6,
              backgroundColor: p.color,
              opacity: p.life / 100,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 ${p.life / 10}px ${p.color}`,
            }}
          />
        ))}

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.size || 4,
              height: p.size || 4,
              backgroundColor: p.color,
              opacity: p.life / 100,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 ${(p.size || 4) * 2}px ${p.color}`,
            }}
          />
        ))}

        {/* Food */}
        <div
          className="absolute rounded-full border-2 border-black transition-all duration-100"
          style={{
            left: food.position.x * CELL_SIZE + 2,
            top: food.position.y * CELL_SIZE + 2,
            width: CELL_SIZE - 4,
            height: CELL_SIZE - 4,
            backgroundColor: food.type === "golden" ? "#eab308" : food.type === "speed" ? "#3b82f6" : "#ef4444",
            boxShadow: `0 0 10px ${food.type === "golden" ? "#eab308" : food.type === "speed" ? "#3b82f6" : "#ef4444"}`,
            transform: `scale(${1 + Math.sin(frameCount * 0.2) * 0.1})`,
          }}
        />

        {/* Bonus Food */}
        {bonusFood && (
          <div
            className="absolute rounded-full border-2 border-black"
            style={{
              left: bonusFood.position.x * CELL_SIZE,
              top: bonusFood.position.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor:
                bonusFood.type === "golden" ? "#eab308" :
                bonusFood.type === "speed" ? "#3b82f6" :
                bonusFood.type === "ghost" ? "#a855f7" : "#ec4899",
              boxShadow: `0 0 15px ${
                bonusFood.type === "golden" ? "#eab308" :
                bonusFood.type === "speed" ? "#3b82f6" :
                bonusFood.type === "ghost" ? "#a855f7" : "#ec4899"
              }`,
              transform: `scale(${1 + Math.sin(frameCount * 0.3) * 0.15})`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black">
              {bonusFood.type === "golden" ? "50" : bonusFood.type === "speed" ? "⚡" : bonusFood.type === "ghost" ? "👻" : "🧲"}
            </div>
          </div>
        )}

        {/* Snake */}
        {snake.map((segment, index) => {
          const segmentColor = getSegmentColor(index);
          const isHead = index === 0;
          const glow = SKINS[skin].glow;

          return (
            <div
              key={index}
              className="absolute border-2 border-black transition-all duration-50"
              style={{
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: segmentColor,
                borderRadius: isHead ? "6px" : index === snake.length - 1 ? "3px" : "4px",
                zIndex: snake.length - index,
                opacity: isGhost ? 0.6 : 1 - index * 0.015,
                boxShadow: isHead ? `0 0 12px ${glow}` : `0 0 ${8 - index * 0.5}px ${segmentColor}50`,
                transform: isHead ? `scale(${1 + Math.sin(frameCount * 0.3) * 0.05})` : undefined,
              }}
            >
              {isHead && (
                <>
                  {direction === "RIGHT" && (
                    <>
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0.5 right-0 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0.5 right-0 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                    </>
                  )}
                  {direction === "LEFT" && (
                    <>
                      <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0.5 left-0 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0.5 left-0 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                    </>
                  )}
                  {direction === "UP" && (
                    <>
                      <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0 left-0.5 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute top-0 right-0.5 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                    </>
                  )}
                  {direction === "DOWN" && (
                    <>
                      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute bottom-0 left-0.5 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow-inner">
                        <div className="absolute bottom-0 right-0.5 w-1.5 h-1.5 bg-black rounded-full" />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Menu overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2 overflow-y-auto">
            <div className="bg-white border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center max-w-[320px]">
              <div className="text-3xl mb-2">🐍</div>
              <h2 className="text-lg font-black mb-2">SNAKE</h2>

              {/* Skin selector */}
              <div className="mb-3">
                <div className="text-xs font-bold mb-1">CHOOSE SKIN</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(SKINS) as SnakeSkin[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSkin(s)}
                      className={`p-1 border-2 border-black text-xs font-bold transition-all
                        ${skin === s ? "scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "opacity-70"}`}
                      style={{ backgroundColor: SKINS[s].colors[0] }}
                    >
                      {SKINS[s].emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="flex gap-2 justify-center mb-3">
                <button
                  onClick={() => setControlMode("buttons")}
                  className={`px-2 py-1 border-2 border-black font-bold text-xs ${controlMode === "buttons" ? "bg-emerald-400" : "bg-gray-200"}`}
                >
                  BUTTONS
                </button>
                <button
                  onClick={() => setControlMode("swipe")}
                  className={`px-2 py-1 border-2 border-black font-bold text-xs ${controlMode === "swipe" ? "bg-emerald-400" : "bg-gray-200"}`}
                >
                  SWIPE
                </button>
              </div>

              <div className="flex justify-center mb-3">
                <button
                  onClick={() => setWrapMode(!wrapMode)}
                  className={`px-3 py-1 border-2 border-black font-bold text-xs ${wrapMode ? "bg-cyan-400" : "bg-gray-200"}`}
                >
                  {wrapMode ? "🌀 WRAP: ON" : "🧱 WRAP: OFF"}
                </button>
              </div>

              <button
                onClick={handleAction}
                className="bg-emerald-400 border-4 border-black px-6 py-2 font-black text-lg
                  hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                START
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div
              className="text-7xl font-black text-white"
              style={{ textShadow: `0 0 20px ${SKINS[skin].glow}, 4px 4px 0 #000` }}
            >
              {countdown === 0 ? "GO!" : countdown}
            </div>
          </div>
        )}

        {/* Paused */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
              <h2 className="text-2xl font-black mb-3">PAUSED</h2>
              <button
                onClick={togglePause}
                className="bg-cyan-400 border-4 border-black px-6 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                RESUME
              </button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
              <h2 className="text-2xl font-black mb-1 text-rose-500">GAME OVER</h2>
              <div className="text-4xl font-black mb-1">{score}</div>
              <p className="font-bold text-gray-500 text-sm">Length: {snake.length}</p>
              {showNewHighScore ? (
                <div className="my-2 px-3 py-1 bg-yellow-400 border-2 border-black font-black animate-pulse">
                  🎉 NEW HIGH SCORE! 🎉
                </div>
              ) : (
                <p className="font-bold text-gray-600 text-sm mb-2">Best: {highScore}</p>
              )}
              <button
                onClick={handleAction}
                className="bg-emerald-400 border-4 border-black px-6 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      {(gameState === "playing" || gameState === "countdown") && controlMode === "buttons" && (
        <div className="mt-3">
          <div className="flex flex-col items-center gap-1">
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection("UP"); }}
              onClick={() => changeDirection("UP")}
              className="w-14 h-14 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-2xl
                active:translate-x-1 active:translate-y-1 active:shadow-none select-none"
              style={{ backgroundColor: SKINS[skin].colors[0] }}
            >
              ↑
            </button>
            <div className="flex gap-1">
              <button
                onTouchStart={(e) => { e.preventDefault(); changeDirection("LEFT"); }}
                onClick={() => changeDirection("LEFT")}
                className="w-14 h-14 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-2xl
                  active:translate-x-1 active:translate-y-1 active:shadow-none select-none"
                style={{ backgroundColor: SKINS[skin].colors[0] }}
              >
                ←
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); changeDirection("DOWN"); }}
                onClick={() => changeDirection("DOWN")}
                className="w-14 h-14 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-2xl
                  active:translate-x-1 active:translate-y-1 active:shadow-none select-none"
                style={{ backgroundColor: SKINS[skin].colors[0] }}
              >
                ↓
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); changeDirection("RIGHT"); }}
                onClick={() => changeDirection("RIGHT")}
                className="w-14 h-14 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-2xl
                  active:translate-x-1 active:translate-y-1 active:shadow-none select-none"
                style={{ backgroundColor: SKINS[skin].colors[0] }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex gap-1 flex-wrap justify-center text-xs">
        <div className="px-2 py-0.5 bg-red-500 border-2 border-black font-bold text-white">🍎+10</div>
        <div className="px-2 py-0.5 bg-yellow-400 border-2 border-black font-bold">⭐+50</div>
        <div className="px-2 py-0.5 bg-blue-500 border-2 border-black font-bold text-white">⚡+30</div>
        <div className="px-2 py-0.5 bg-purple-500 border-2 border-black font-bold text-white">👻+40</div>
        <div className="px-2 py-0.5 bg-pink-500 border-2 border-black font-bold text-white">🧲+35</div>
      </div>
    </div>
  );
}
