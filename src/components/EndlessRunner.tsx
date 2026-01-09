"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";
type PowerUpType = "shield" | "magnet" | "nitro";
type Lane = 0 | 1 | 2;

interface Obstacle {
  id: number;
  lane: Lane;
  z: number;
  type: "car" | "truck" | "barrier";
  color: string;
}

interface Coin {
  id: number;
  lane: Lane;
  z: number;
  collected: boolean;
}

interface PowerUp {
  id: number;
  lane: Lane;
  z: number;
  type: PowerUpType;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface RoadLine {
  id: number;
  z: number;
}

const GAME_WIDTH = 450;
const GAME_HEIGHT = 650;
const ROAD_WIDTH = 300;
const LANE_WIDTH = ROAD_WIDTH / 3;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 90;
const INITIAL_SPEED = 8;
const MAX_SPEED = 20;
const SPEED_INCREMENT = 0.002;

const OBSTACLE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"
];

const CAR_SKINS = [
  { body: "#ef4444", accent: "#fca5a5", name: "Red Fury" },
  { body: "#3b82f6", accent: "#93c5fd", name: "Blue Thunder" },
  { body: "#10b981", accent: "#6ee7b7", name: "Green Machine" },
  { body: "#f59e0b", accent: "#fcd34d", name: "Gold Rush" },
  { body: "#8b5cf6", accent: "#c4b5fd", name: "Purple Haze" },
];

function useSound() {
  const playSound = useCallback((type: "coin" | "crash" | "powerup" | "nitro" | "nearMiss" | "levelUp") => {
    if (typeof window === "undefined") return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case "coin":
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.05);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case "crash":
          oscillator.frequency.value = 100;
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        case "powerup":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case "nitro":
          oscillator.frequency.value = 150;
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case "nearMiss":
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.05);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case "levelUp":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
      }
    } catch {
      // Audio not supported
    }
  }, []);
  return { playSound };
}

export default function EndlessRunner({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [playerLane, setPlayerLane] = useState<Lane>(1);
  const [targetLane, setTargetLane] = useState<Lane>(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [roadLines, setRoadLines] = useState<RoadLine[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [countdown, setCountdown] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [carSkin, setCarSkin] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [nitroActive, setNitroActive] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [nearMiss, setNearMiss] = useState(false);
  const [combo, setCombo] = useState(0);

  // Refs
  const gameStateRef = useRef<GameState>("menu");
  const playerLaneRef = useRef<Lane>(1);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const roadLinesRef = useRef<RoadLine[]>([]);
  const scoreRef = useRef(0);
  const coinCountRef = useRef(0);
  const distanceRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const animationFrameRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const roadLineIdRef = useRef(0);
  const lastObstacleSpawnRef = useRef(0);
  const lastCoinSpawnRef = useRef(0);
  const lastPowerUpSpawnRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const magnetTimerRef = useRef(0);
  const nitroTimerRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);

  const { playSound } = useSound();

  // Sync refs
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    playerLaneRef.current = targetLane;
    setPlayerLane(targetLane);
  }, [targetLane]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("endlessRunnerHighScore");
    if (saved) setHighScore(parseInt(saved));
    const savedSkin = localStorage.getItem("endlessRunnerCarSkin");
    if (savedSkin) setCarSkin(parseInt(savedSkin));
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, colors: string[]) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
      });
    }
    return newParticles;
  }, []);

  const startGame = useCallback(() => {
    setCountdown(3);
    setGameState("countdown");
    gameStateRef.current = "countdown";

    // Reset
    playerLaneRef.current = 1;
    obstaclesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    coinCountRef.current = 0;
    distanceRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    shieldTimerRef.current = 0;
    magnetTimerRef.current = 0;
    nitroTimerRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;

    // Initialize road lines
    roadLinesRef.current = [];
    for (let i = 0; i < 20; i++) {
      roadLinesRef.current.push({ id: roadLineIdRef.current++, z: i * 50 });
    }

    setTargetLane(1);
    setPlayerLane(1);
    setObstacles([]);
    setCoins([]);
    setPowerUps([]);
    setParticles([]);
    setRoadLines([...roadLinesRef.current]);
    setScore(0);
    setCoinCount(0);
    setDistance(0);
    setSpeed(INITIAL_SPEED);
    setShieldActive(false);
    setMagnetActive(false);
    setNitroActive(false);
    setCombo(0);
  }, []);

  // Countdown
  useEffect(() => {
    if (gameState !== "countdown") return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, [gameState, countdown]);

  const endGame = useCallback(() => {
    if (soundEnabled) playSound("crash");
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    // Explosion particles
    const carX = GAME_WIDTH / 2 + (playerLaneRef.current - 1) * LANE_WIDTH;
    particlesRef.current.push(...spawnParticles(carX, GAME_HEIGHT - 150, 30, ["#ef4444", "#f97316", "#fbbf24", "#fff"]));
    setParticles([...particlesRef.current]);

    setTimeout(() => {
      setGameState("gameover");
      gameStateRef.current = "gameover";

      const finalScore = scoreRef.current + coinCountRef.current * 10;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem("endlessRunnerHighScore", finalScore.toString());
      }
    }, 500);
  }, [soundEnabled, playSound, spawnParticles, highScore]);

  const changeLane = useCallback((direction: "left" | "right") => {
    if (gameStateRef.current !== "playing") return;
    setTargetLane((prev) => {
      if (direction === "left" && prev > 0) return (prev - 1) as Lane;
      if (direction === "right" && prev < 2) return (prev + 1) as Lane;
      return prev;
    });
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

  // Game loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") return;

    const gameLoop = () => {
      if (gameStateRef.current === "countdown") {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      if (gameStateRef.current !== "playing") return;

      const currentSpeed = nitroTimerRef.current > 0 ? speedRef.current * 1.5 : speedRef.current;

      // Increase speed
      speedRef.current = Math.min(MAX_SPEED, speedRef.current + SPEED_INCREMENT);
      setSpeed(speedRef.current);

      // Update distance
      distanceRef.current += currentSpeed;
      setDistance(Math.floor(distanceRef.current));

      // Update score
      scoreRef.current = Math.floor(distanceRef.current / 10);
      setScore(scoreRef.current);

      // Update road lines
      roadLinesRef.current = roadLinesRef.current.map(line => ({
        ...line,
        z: line.z - currentSpeed,
      })).filter(line => line.z > -50);

      while (roadLinesRef.current.length < 20) {
        const lastZ = roadLinesRef.current.length > 0
          ? Math.max(...roadLinesRef.current.map(l => l.z))
          : 0;
        roadLinesRef.current.push({ id: roadLineIdRef.current++, z: lastZ + 50 });
      }
      setRoadLines([...roadLinesRef.current]);

      // Spawn obstacles
      const now = Date.now();
      const spawnInterval = Math.max(800 - speedRef.current * 20, 400);
      if (now - lastObstacleSpawnRef.current > spawnInterval) {
        lastObstacleSpawnRef.current = now;
        const lane = Math.floor(Math.random() * 3) as Lane;
        const types: ("car" | "truck" | "barrier")[] = ["car", "car", "car", "truck", "barrier"];
        obstaclesRef.current.push({
          id: obstacleIdRef.current++,
          lane,
          z: 1000,
          type: types[Math.floor(Math.random() * types.length)],
          color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)],
        });
      }

      // Spawn coins
      if (now - lastCoinSpawnRef.current > 300) {
        lastCoinSpawnRef.current = now;
        if (Math.random() < 0.4) {
          const lane = Math.floor(Math.random() * 3) as Lane;
          coinsRef.current.push({
            id: coinIdRef.current++,
            lane,
            z: 1000,
            collected: false,
          });
        }
      }

      // Spawn power-ups
      if (now - lastPowerUpSpawnRef.current > 8000) {
        lastPowerUpSpawnRef.current = now;
        if (Math.random() < 0.5) {
          const lane = Math.floor(Math.random() * 3) as Lane;
          const types: PowerUpType[] = ["shield", "magnet", "nitro"];
          powerUpsRef.current.push({
            id: powerUpIdRef.current++,
            lane,
            z: 1000,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
      }

      // Update obstacles
      obstaclesRef.current = obstaclesRef.current.map(obs => ({
        ...obs,
        z: obs.z - currentSpeed,
      })).filter(obs => obs.z > -100);

      // Update coins (with magnet effect)
      coinsRef.current = coinsRef.current.map(coin => {
        let newLane = coin.lane;
        if (magnetTimerRef.current > 0 && !coin.collected && coin.z < 400) {
          // Attract to player lane
          if (coin.lane < playerLaneRef.current) newLane = Math.min(2, coin.lane + 0.1) as Lane;
          if (coin.lane > playerLaneRef.current) newLane = Math.max(0, coin.lane - 0.1) as Lane;
        }
        return {
          ...coin,
          lane: newLane,
          z: coin.z - currentSpeed,
        };
      }).filter(coin => coin.z > -50 && !coin.collected);

      // Update power-ups
      powerUpsRef.current = powerUpsRef.current.map(pu => ({
        ...pu,
        z: pu.z - currentSpeed,
      })).filter(pu => pu.z > -50);

      // Collision detection
      const playerX = (playerLaneRef.current - 1) * LANE_WIDTH;
      const playerZ = 100;

      // Check obstacle collisions
      for (const obs of obstaclesRef.current) {
        const obsX = (obs.lane - 1) * LANE_WIDTH;
        const obsWidth = obs.type === "truck" ? 60 : 50;
        const obsHeight = obs.type === "truck" ? 120 : 90;

        if (
          Math.abs(playerX - obsX) < (CAR_WIDTH + obsWidth) / 2 - 10 &&
          obs.z < playerZ + CAR_HEIGHT / 2 &&
          obs.z > playerZ - obsHeight / 2
        ) {
          if (shieldTimerRef.current > 0) {
            // Shield protects
            shieldTimerRef.current = 0;
            setShieldActive(false);
            obstaclesRef.current = obstaclesRef.current.filter(o => o.id !== obs.id);
            particlesRef.current.push(...spawnParticles(
              GAME_WIDTH / 2 + playerX,
              GAME_HEIGHT - 150,
              15,
              ["#3b82f6", "#60a5fa", "#fff"]
            ));
          } else {
            endGame();
            return;
          }
        }

        // Near miss detection
        if (
          Math.abs(playerX - obsX) < (CAR_WIDTH + obsWidth) / 2 + 15 &&
          Math.abs(playerX - obsX) > (CAR_WIDTH + obsWidth) / 2 - 10 &&
          obs.z < playerZ + 20 &&
          obs.z > playerZ - 20
        ) {
          comboRef.current++;
          comboTimerRef.current = 60;
          setCombo(comboRef.current);
          setNearMiss(true);
          setTimeout(() => setNearMiss(false), 200);
          scoreRef.current += 50 * comboRef.current;
          if (soundEnabled) playSound("nearMiss");
        }
      }

      // Coin collection
      for (const coin of coinsRef.current) {
        const coinX = (coin.lane - 1) * LANE_WIDTH;
        if (
          Math.abs(playerX - coinX) < LANE_WIDTH * 0.8 &&
          coin.z < playerZ + 30 &&
          coin.z > playerZ - 30 &&
          !coin.collected
        ) {
          coin.collected = true;
          coinCountRef.current++;
          setCoinCount(coinCountRef.current);
          if (soundEnabled) playSound("coin");
          particlesRef.current.push(...spawnParticles(
            GAME_WIDTH / 2 + coinX,
            GAME_HEIGHT - 150,
            8,
            ["#fbbf24", "#fcd34d", "#fef3c7"]
          ));
        }
      }

      // Power-up collection
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        const puX = (pu.lane - 1) * LANE_WIDTH;
        if (
          Math.abs(playerX - puX) < LANE_WIDTH * 0.8 &&
          pu.z < playerZ + 30 &&
          pu.z > playerZ - 30
        ) {
          if (soundEnabled) playSound("powerup");
          particlesRef.current.push(...spawnParticles(
            GAME_WIDTH / 2 + puX,
            GAME_HEIGHT - 150,
            12,
            pu.type === "shield" ? ["#3b82f6", "#60a5fa"] :
            pu.type === "magnet" ? ["#a855f7", "#c084fc"] :
            ["#f97316", "#fb923c"]
          ));

          switch (pu.type) {
            case "shield":
              shieldTimerRef.current = 600;
              setShieldActive(true);
              break;
            case "magnet":
              magnetTimerRef.current = 500;
              setMagnetActive(true);
              break;
            case "nitro":
              nitroTimerRef.current = 300;
              setNitroActive(true);
              break;
          }

          powerUpsRef.current.splice(i, 1);
        }
      }

      // Update timers
      if (shieldTimerRef.current > 0) shieldTimerRef.current--;
      else setShieldActive(false);
      if (magnetTimerRef.current > 0) magnetTimerRef.current--;
      else setMagnetActive(false);
      if (nitroTimerRef.current > 0) {
        nitroTimerRef.current--;
        if (nitroTimerRef.current % 3 === 0 && soundEnabled) playSound("nitro");
      } else setNitroActive(false);

      // Combo timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current--;
        if (comboTimerRef.current === 0) {
          comboRef.current = 0;
          setCombo(0);
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.2,
          life: p.life - 1,
        }))
        .filter(p => p.life > 0);

      // Update state
      setObstacles([...obstaclesRef.current]);
      setCoins([...coinsRef.current]);
      setPowerUps([...powerUpsRef.current]);
      setParticles([...particlesRef.current]);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, soundEnabled, playSound, spawnParticles, endGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        changeLane("left");
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        changeLane("right");
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
          startGame();
        }
      }
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeLane, startGame, togglePause]);

  // Touch controls
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 30) changeLane("right");
    if (deltaX < -30) changeLane("left");
  };

  // Calculate 3D position
  const getPosition = (lane: number, z: number) => {
    const perspective = 800;
    const scale = perspective / (perspective + z);
    const x = GAME_WIDTH / 2 + (lane - 1) * LANE_WIDTH * scale;
    const y = GAME_HEIGHT - 100 - z * scale * 0.5;
    return { x, y, scale };
  };

  const currentSkin = CAR_SKINS[carSkin];

  return (
    <div className="flex flex-col items-center w-full max-w-[500px] px-2">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="px-3 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-sm
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          ← Back
        </button>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 border-4 border-black px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">ROAD RUSH</h1>
        </div>

        <div className="flex gap-2">
          {(gameState === "playing" || gameState === "paused") && (
            <button
              onClick={togglePause}
              className="w-10 h-10 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg
                hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100 flex items-center justify-center"
            >
              {gameState === "paused" ? "▶" : "⏸"}
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg
              hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100 flex items-center justify-center"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 mb-3 flex-wrap justify-center">
        <div className="px-3 py-1.5 bg-gradient-to-b from-yellow-400 to-yellow-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[70px]">
          <div className="text-[10px] font-bold text-black/70">SCORE</div>
          <div className="text-lg font-black">{score + coinCount * 10}</div>
        </div>
        <div className="px-3 py-1.5 bg-gradient-to-b from-orange-400 to-orange-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[70px]">
          <div className="text-[10px] font-bold text-black/70">BEST</div>
          <div className="text-lg font-black">{highScore}</div>
        </div>
        <div className="px-3 py-1.5 bg-gradient-to-b from-cyan-400 to-cyan-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[60px]">
          <div className="text-[10px] font-bold text-black/70">COINS</div>
          <div className="text-lg font-black">🪙 {coinCount}</div>
        </div>
        <div className="px-3 py-1.5 bg-gradient-to-b from-green-400 to-green-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[70px]">
          <div className="text-[10px] font-bold text-black/70">SPEED</div>
          <div className="text-lg font-black">{Math.floor(speed * 10)} km/h</div>
        </div>
      </div>

      {/* Active Power-ups */}
      <AnimatePresence>
        {(shieldActive || magnetActive || nitroActive) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2 mb-2"
          >
            {shieldActive && (
              <div className="px-3 py-1 bg-blue-500 border-2 border-black text-white text-xs font-bold flex items-center gap-1 animate-pulse">
                🛡️ SHIELD
              </div>
            )}
            {magnetActive && (
              <div className="px-3 py-1 bg-purple-500 border-2 border-black text-white text-xs font-bold flex items-center gap-1 animate-pulse">
                🧲 MAGNET
              </div>
            )}
            {nitroActive && (
              <div className="px-3 py-1 bg-orange-500 border-2 border-black text-white text-xs font-bold flex items-center gap-1 animate-pulse">
                🔥 NITRO
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combo */}
      <AnimatePresence>
        {combo > 0 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 border-2 border-black text-white text-sm font-black mb-2"
          >
            NEAR MISS x{combo}! +{50 * combo}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Area */}
      <div
        className="relative overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #581c87 100%)",
          transform: screenShake ? `translate(${Math.random() * 8 - 4}px, ${Math.random() * 8 - 4}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 13) % 40}%`,
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              opacity: 0.3 + (i % 5) * 0.15,
            }}
          />
        ))}

        {/* City skyline */}
        <div className="absolute bottom-[35%] left-0 right-0 flex justify-center gap-1 opacity-30">
          {[60, 100, 45, 120, 70, 90, 55, 110, 65, 85, 50, 95].map((h, i) => (
            <div
              key={i}
              className="bg-gradient-to-t from-purple-900 to-purple-700"
              style={{
                width: 20 + (i % 3) * 10,
                height: h,
                marginTop: 120 - h,
              }}
            >
              {/* Windows */}
              <div className="grid grid-cols-2 gap-1 p-1 mt-2">
                {Array.from({ length: Math.floor(h / 15) }).map((_, j) => (
                  <div
                    key={j}
                    className={`h-1.5 ${Math.random() > 0.3 ? "bg-yellow-300/60" : "bg-transparent"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Road */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: ROAD_WIDTH + 40,
            height: "70%",
            background: "linear-gradient(180deg, #374151 0%, #1f2937 100%)",
            clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
          }}
        >
          {/* Road edge glow */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, #f97316 0%, transparent 5%, transparent 95%, #f97316 100%)",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Lane dividers */}
        {roadLines.map((line) => {
          const pos = getPosition(0.33, line.z);
          const pos2 = getPosition(0.66, line.z);
          if (pos.scale < 0.1) return null;
          return (
            <div key={line.id}>
              <div
                className="absolute bg-white"
                style={{
                  left: pos.x - 2,
                  top: pos.y,
                  width: 4 * pos.scale,
                  height: 20 * pos.scale,
                  opacity: pos.scale,
                }}
              />
              <div
                className="absolute bg-white"
                style={{
                  left: pos2.x + LANE_WIDTH * pos.scale - 2,
                  top: pos.y,
                  width: 4 * pos.scale,
                  height: 20 * pos.scale,
                  opacity: pos.scale,
                }}
              />
            </div>
          );
        })}

        {/* Obstacles */}
        {obstacles.map((obs) => {
          const pos = getPosition(obs.lane, obs.z);
          if (pos.scale < 0.15) return null;
          const width = (obs.type === "truck" ? 60 : 50) * pos.scale;
          const height = (obs.type === "truck" ? 120 : 90) * pos.scale;

          return (
            <motion.div
              key={obs.id}
              className="absolute"
              style={{
                left: pos.x - width / 2,
                top: pos.y - height,
                width,
                height,
                zIndex: Math.floor(1000 - obs.z),
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {obs.type === "barrier" ? (
                <div
                  className="w-full h-full rounded"
                  style={{
                    background: `repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, #1f2937 10px, #1f2937 20px)`,
                    border: "2px solid #1f2937",
                  }}
                />
              ) : (
                <svg viewBox="0 0 50 90" className="w-full h-full">
                  <defs>
                    <linearGradient id={`obs-${obs.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={obs.color} />
                      <stop offset="50%" stopColor={obs.color} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={obs.color} stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  {/* Car body */}
                  <rect x="5" y="20" width="40" height="60" rx="5" fill={`url(#obs-${obs.id})`} />
                  <rect x="8" y="25" width="34" height="20" rx="3" fill="#1e293b" opacity="0.8" />
                  {/* Taillights */}
                  <rect x="8" y="75" width="10" height="4" rx="1" fill="#ef4444" />
                  <rect x="32" y="75" width="10" height="4" rx="1" fill="#ef4444" />
                </svg>
              )}
            </motion.div>
          );
        })}

        {/* Coins */}
        {coins.filter(c => !c.collected).map((coin) => {
          const pos = getPosition(coin.lane, coin.z);
          if (pos.scale < 0.2) return null;
          const size = 25 * pos.scale;

          return (
            <motion.div
              key={coin.id}
              className="absolute"
              style={{
                left: pos.x - size / 2,
                top: pos.y - size,
                width: size,
                height: size,
                zIndex: Math.floor(1000 - coin.z),
              }}
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div
                className="w-full h-full rounded-full border-2 border-yellow-600 flex items-center justify-center font-bold"
                style={{
                  background: "linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)",
                  fontSize: size * 0.5,
                  boxShadow: "0 0 10px #fbbf24",
                }}
              >
                $
              </div>
            </motion.div>
          );
        })}

        {/* Power-ups */}
        {powerUps.map((pu) => {
          const pos = getPosition(pu.lane, pu.z);
          if (pos.scale < 0.2) return null;
          const size = 35 * pos.scale;
          const colors = pu.type === "shield" ? ["#3b82f6", "#1d4ed8"] :
                        pu.type === "magnet" ? ["#a855f7", "#7c3aed"] :
                        ["#f97316", "#ea580c"];

          return (
            <motion.div
              key={pu.id}
              className="absolute"
              style={{
                left: pos.x - size / 2,
                top: pos.y - size,
                width: size,
                height: size,
                zIndex: Math.floor(1000 - pu.z),
              }}
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <div
                className="w-full h-full rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                  boxShadow: `0 0 15px ${colors[0]}`,
                  fontSize: size * 0.5,
                }}
              >
                {pu.type === "shield" ? "🛡️" : pu.type === "magnet" ? "🧲" : "🔥"}
              </div>
            </motion.div>
          );
        })}

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / 50,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
            }}
          />
        ))}

        {/* Player Car */}
        {gameState !== "gameover" && (
          <motion.div
            className="absolute"
            style={{
              left: GAME_WIDTH / 2 - CAR_WIDTH / 2,
              bottom: 80,
              width: CAR_WIDTH,
              height: CAR_HEIGHT,
              zIndex: 1000,
            }}
            animate={{
              x: (targetLane - 1) * LANE_WIDTH,
              rotate: targetLane !== playerLane ? (targetLane > playerLane ? 8 : -8) : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Shield effect */}
            {shieldActive && (
              <motion.div
                className="absolute -inset-3 rounded-full border-4 border-blue-400"
                style={{
                  background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}

            {/* Speed lines */}
            {(nitroActive || speed > 12) && (
              <>
                <div className="absolute left-1 -bottom-4 w-1 h-8 bg-gradient-to-t from-transparent to-cyan-400 opacity-60" />
                <div className="absolute right-1 -bottom-4 w-1 h-8 bg-gradient-to-t from-transparent to-cyan-400 opacity-60" />
                <div className="absolute left-3 -bottom-6 w-0.5 h-10 bg-gradient-to-t from-transparent to-cyan-400 opacity-40" />
                <div className="absolute right-3 -bottom-6 w-0.5 h-10 bg-gradient-to-t from-transparent to-cyan-400 opacity-40" />
              </>
            )}

            {/* Nitro flames */}
            {nitroActive && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 -bottom-8"
                animate={{ scaleY: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.1, repeat: Infinity }}
              >
                <div className="w-8 h-12 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full blur-sm" />
              </motion.div>
            )}

            {/* Car SVG */}
            <svg viewBox="0 0 50 90" className="w-full h-full drop-shadow-lg">
              <defs>
                <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={currentSkin.accent} />
                  <stop offset="50%" stopColor={currentSkin.body} />
                  <stop offset="100%" stopColor={currentSkin.body} stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="carWindshield" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
                <filter id="carGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Car shadow */}
              <ellipse cx="25" cy="88" rx="22" ry="4" fill="rgba(0,0,0,0.3)" />

              {/* Car body */}
              <path
                d="M8,75 L8,35 Q8,25 15,20 L35,20 Q42,25 42,35 L42,75 Q42,80 37,82 L13,82 Q8,80 8,75"
                fill="url(#carBody)"
                stroke={currentSkin.accent}
                strokeWidth="1"
              />

              {/* Windshield */}
              <path
                d="M12,38 L12,28 Q12,24 18,22 L32,22 Q38,24 38,28 L38,38 Q38,42 32,44 L18,44 Q12,42 12,38"
                fill="url(#carWindshield)"
                opacity="0.9"
              />

              {/* Hood details */}
              <rect x="15" y="45" width="20" height="2" rx="1" fill={currentSkin.accent} opacity="0.5" />
              <rect x="18" y="50" width="14" height="1" rx="0.5" fill={currentSkin.accent} opacity="0.3" />

              {/* Headlights */}
              <ellipse cx="14" cy="25" rx="3" ry="4" fill="#fef3c7" filter="url(#carGlow)" />
              <ellipse cx="36" cy="25" rx="3" ry="4" fill="#fef3c7" filter="url(#carGlow)" />

              {/* Taillights */}
              <rect x="10" y="76" width="8" height="3" rx="1" fill="#ef4444" filter="url(#carGlow)" />
              <rect x="32" y="76" width="8" height="3" rx="1" fill="#ef4444" filter="url(#carGlow)" />

              {/* Side mirrors */}
              <rect x="3" y="32" width="4" height="6" rx="1" fill={currentSkin.body} />
              <rect x="43" y="32" width="4" height="6" rx="1" fill={currentSkin.body} />

              {/* Wheels */}
              <ellipse cx="12" cy="70" rx="4" ry="6" fill="#1f2937" />
              <ellipse cx="38" cy="70" rx="4" ry="6" fill="#1f2937" />
              <ellipse cx="12" cy="30" rx="4" ry="6" fill="#1f2937" />
              <ellipse cx="38" cy="30" rx="4" ry="6" fill="#1f2937" />
            </svg>

            {/* Near miss flash */}
            <AnimatePresence>
              {nearMiss && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ boxShadow: "0 0 30px #facc15, 0 0 60px #facc15" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Menu Overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000]">
            <motion.div
              className="bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-purple-500 p-6 text-center max-w-sm w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)" }}
            >
              <div className="text-5xl mb-3">🏎️</div>
              <h2 className="text-3xl font-black text-white mb-2">ROAD RUSH</h2>
              <p className="text-purple-300 font-bold mb-4 text-sm">
                Dodge traffic, collect coins, survive the rush!
              </p>

              {/* Car selector */}
              <div className="mb-4">
                <div className="text-xs font-bold text-purple-400 mb-2">SELECT CAR</div>
                <div className="flex justify-center gap-2">
                  {CAR_SKINS.map((skin, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCarSkin(i);
                        localStorage.setItem("endlessRunnerCarSkin", i.toString());
                      }}
                      className={`w-10 h-10 rounded-lg border-2 ${carSkin === i ? "border-white scale-110" : "border-gray-600"}`}
                      style={{ background: `linear-gradient(135deg, ${skin.accent} 0%, ${skin.body} 100%)` }}
                    />
                  ))}
                </div>
                <div className="text-xs text-purple-300 mt-1">{CAR_SKINS[carSkin].name}</div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 p-3 mb-4 text-left text-xs rounded">
                <div className="text-slate-300 font-bold space-y-1">
                  <div>← → or A D : Change lane</div>
                  <div>Swipe : Change lane (mobile)</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mb-4 text-xs">
                <div className="px-2 py-1 bg-blue-500/30 border border-blue-500 text-blue-300 rounded">🛡️ Shield</div>
                <div className="px-2 py-1 bg-purple-500/30 border border-purple-500 text-purple-300 rounded">🧲 Magnet</div>
                <div className="px-2 py-1 bg-orange-500/30 border border-orange-500 text-orange-300 rounded">🔥 Nitro</div>
              </div>

              <motion.button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 border-4 border-purple-400 px-6 py-3 font-black text-xl text-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                START GAME
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[2000]">
            <motion.div
              className="text-8xl font-black text-white"
              style={{ textShadow: "0 0 30px #a855f7, 0 0 60px #a855f7" }}
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              {countdown === 0 ? "GO!" : countdown}
            </motion.div>
          </div>
        )}

        {/* Paused */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[2000]">
            <motion.div
              className="bg-slate-800 border-4 border-purple-500 p-8 text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-4xl font-black text-white mb-4">PAUSED</h2>
              <motion.button
                onClick={togglePause}
                className="bg-purple-600 border-4 border-purple-400 px-8 py-3 font-black text-xl text-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                RESUME
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* Game Over */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000]">
            <motion.div
              className="bg-slate-800 border-4 border-rose-500 p-6 text-center max-w-sm w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h2 className="text-4xl font-black text-rose-500 mb-2">GAME OVER</h2>
              <div className="text-5xl font-black text-white mb-3">{score + coinCount * 10}</div>

              {score + coinCount * 10 >= highScore && score + coinCount * 10 > 0 && (
                <motion.div
                  className="text-yellow-400 font-black mb-3 text-xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  🎉 NEW HIGH SCORE!
                </motion.div>
              )}

              <div className="bg-slate-700/50 border border-slate-600 p-3 mb-4 text-sm rounded">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Distance:</span>
                  <span className="font-black text-cyan-400">{distance}m</span>
                </div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Coins:</span>
                  <span className="font-black text-yellow-400">🪙 {coinCount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Max Speed:</span>
                  <span className="font-black text-green-400">{Math.floor(speed * 10)} km/h</span>
                </div>
              </div>

              <motion.button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 border-4 border-purple-400 px-6 py-3 font-black text-xl text-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                PLAY AGAIN
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 flex gap-4 sm:hidden">
        <motion.button
          onTouchStart={() => changeLane("left")}
          className="w-20 h-16 bg-gradient-to-b from-slate-600 to-slate-700 border-4 border-black rounded-xl font-black text-3xl text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          whileTap={{ scale: 0.95 }}
        >
          ←
        </motion.button>
        <motion.button
          onTouchStart={() => changeLane("right")}
          className="w-20 h-16 bg-gradient-to-b from-slate-600 to-slate-700 border-4 border-black rounded-xl font-black text-3xl text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          whileTap={{ scale: 0.95 }}
        >
          →
        </motion.button>
      </div>

      {/* Controls Info */}
      <div className="mt-3 px-4 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center hidden sm:block">
        <span className="font-bold text-xs">
          ← → Change Lane • Collect Coins • Dodge Traffic • Get Power-ups!
        </span>
      </div>
    </div>
  );
}
