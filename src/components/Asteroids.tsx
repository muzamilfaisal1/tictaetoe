"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";
type PowerUpType = "shield" | "rapidfire" | "extralife" | "bomb";

interface Ship {
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
  rotationVelocity: number;
  thrustLevel: number;
}

interface ShipTrail {
  id: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  isEnemy?: boolean;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: "large" | "medium" | "small";
  rotation: number;
  rotationSpeed: number;
  shape: number[];
}

interface UFO {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: "large" | "small";
  lastShot: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  life: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

const GAME_WIDTH = 650;
const GAME_HEIGHT = 550;
const SHIP_SIZE = 24;
const ROTATION_ACCELERATION = 0.8;
const MAX_ROTATION_SPEED = 7;
const ROTATION_FRICTION = 0.92;
const THRUST_POWER = 0.18;
const BRAKE_POWER = 0.08;
const STRAFE_POWER = 0.1;
const FRICTION = 0.995;
const MAX_SPEED = 9;
const BULLET_SPEED = 12;
const BULLET_LIFE = 55;
const ASTEROID_SIZES = { large: 40, medium: 25, small: 12 };
const ASTEROID_SPEEDS = { large: 1.5, medium: 2.5, small: 3.5 };
const ASTEROID_SCORES = { large: 20, medium: 50, small: 100 };
const UFO_SCORES = { large: 200, small: 1000 };
const INITIAL_LIVES = 3;
const INVULNERABLE_TIME = 120;
const COMBO_TIMEOUT = 90;
const SHIELD_DURATION = 600;
const RAPIDFIRE_DURATION = 600;

function generateAsteroidShape(): number[] {
  const points = 10;
  const shape: number[] = [];
  for (let i = 0; i < points; i++) {
    shape.push(0.6 + Math.random() * 0.4);
  }
  return shape;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.5 + 0.1,
    brightness: Math.random() * 0.5 + 0.3,
  }));
}

function useSound() {
  const playSound = useCallback((type: "thrust" | "shoot" | "explosion" | "hit" | "levelUp" | "gameOver" | "powerup" | "ufo" | "hyperspace" | "combo") => {
    if (typeof window === "undefined") return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case "thrust":
          oscillator.frequency.value = 80;
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          break;
        case "shoot":
          oscillator.frequency.value = 600;
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          break;
        case "explosion":
          oscillator.frequency.value = 60;
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.35);
          break;
        case "hit":
          oscillator.frequency.value = 150;
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
        case "levelUp":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
        case "gameOver":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.4);
          oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.6);
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.8);
          break;
        case "powerup":
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.05);
          oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.1);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case "ufo":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.1);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case "hyperspace":
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case "combo":
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.05);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch {
      // Audio not supported
    }
  }, []);
  return { playSound };
}

function createAsteroid(x: number, y: number, size: "large" | "medium" | "small", id: number): Asteroid {
  const angle = Math.random() * Math.PI * 2;
  const speed = ASTEROID_SPEEDS[size] * (0.8 + Math.random() * 0.4);
  return {
    id,
    x,
    y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    size,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 3,
    shape: generateAsteroidShape(),
  };
}

export default function Asteroids({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [ship, setShip] = useState<Ship>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, angle: -90, velocityX: 0, velocityY: 0, rotationVelocity: 0, thrustLevel: 0 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [ufos, setUfos] = useState<UFO[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shipTrail, setShipTrail] = useState<ShipTrail[]>([]);
  const [stars] = useState<Star[]>(() => generateStars(80));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [screenShake, setScreenShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [rapidFireActive, setRapidFireActive] = useState(false);
  const [thrusting, setThrusting] = useState(false);

  // Refs for game loop
  const shipRef = useRef<Ship>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, angle: -90, velocityX: 0, velocityY: 0, rotationVelocity: 0, thrustLevel: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const ufosRef = useRef<UFO[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shipTrailRef = useRef<ShipTrail[]>([]);
  const shipTrailIdRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const levelRef = useRef(1);
  const gameStateRef = useRef<GameState>("menu");
  const keysRef = useRef<Set<string>>(new Set());
  const bulletIdRef = useRef(0);
  const asteroidIdRef = useRef(0);
  const ufoIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastShotRef = useRef(0);
  const invulnerableRef = useRef(0);
  const thrustFrameRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const shieldTimerRef = useRef(0);
  const rapidFireTimerRef = useRef(0);
  const lastUfoSpawnRef = useRef(0);
  const hyperspaceRef = useRef(false);
  const totalKillsRef = useRef(0);
  const maxComboRef = useRef(0);

  // Mobile controls
  const [mobileThrust, setMobileThrust] = useState(false);
  const [mobileLeft, setMobileLeft] = useState(false);
  const [mobileRight, setMobileRight] = useState(false);
  const [mobileFire, setMobileFire] = useState(false);

  const { playSound } = useSound();

  // Sync refs with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("asteroidsHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const spawnAsteroids = useCallback((count: number) => {
    const newAsteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
      let x, y;
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: x = Math.random() * GAME_WIDTH; y = -50; break;
        case 1: x = GAME_WIDTH + 50; y = Math.random() * GAME_HEIGHT; break;
        case 2: x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + 50; break;
        default: x = -50; y = Math.random() * GAME_HEIGHT; break;
      }
      newAsteroids.push(createAsteroid(x, y, "large", asteroidIdRef.current++));
    }
    return newAsteroids;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, colors: string[], sizeRange: [number, number] = [2, 4], speedRange: [number, number] = [1, 5]) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      const life = 25 + Math.random() * 25;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      });
    }
    return newParticles;
  }, []);

  const spawnPowerUp = useCallback((x: number, y: number) => {
    if (Math.random() > 0.15) return; // 15% chance
    const types: PowerUpType[] = ["shield", "rapidfire", "extralife", "bomb"];
    const weights = [0.35, 0.35, 0.15, 0.15];
    let rand = Math.random();
    let type: PowerUpType = "shield";
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        type = types[i];
        break;
      }
    }
    powerUpsRef.current.push({
      id: powerUpIdRef.current++,
      x,
      y,
      type,
      life: 400,
    });
  }, []);

  const resetShip = useCallback(() => {
    shipRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      angle: -90,
      velocityX: 0,
      velocityY: 0,
      rotationVelocity: 0,
      thrustLevel: 0,
    };
    shipTrailRef.current = [];
    invulnerableRef.current = INVULNERABLE_TIME;
    setShip({ ...shipRef.current });
    setShipTrail([]);
  }, []);

  const hyperspace = useCallback(() => {
    if (hyperspaceRef.current) return;
    hyperspaceRef.current = true;

    if (soundEnabled) playSound("hyperspace");
    particlesRef.current.push(...spawnParticles(shipRef.current.x, shipRef.current.y, 20, ["#22d3ee", "#818cf8", "#fff"], [2, 5], [2, 8]));

    // Random position
    shipRef.current.x = 50 + Math.random() * (GAME_WIDTH - 100);
    shipRef.current.y = 50 + Math.random() * (GAME_HEIGHT - 100);
    shipRef.current.velocityX = 0;
    shipRef.current.velocityY = 0;
    invulnerableRef.current = 30;

    setTimeout(() => {
      hyperspaceRef.current = false;
    }, 500);
  }, [soundEnabled, playSound, spawnParticles]);

  const activateBomb = useCallback(() => {
    if (soundEnabled) playSound("explosion");
    setScreenFlash("#f97316");
    setTimeout(() => setScreenFlash(null), 100);

    // Destroy all asteroids and UFOs
    for (const asteroid of asteroidsRef.current) {
      particlesRef.current.push(...spawnParticles(asteroid.x, asteroid.y, 6, ["#94a3b8", "#cbd5e1", "#f97316"]));
      scoreRef.current += ASTEROID_SCORES[asteroid.size];
    }
    for (const ufo of ufosRef.current) {
      particlesRef.current.push(...spawnParticles(ufo.x, ufo.y, 10, ["#22c55e", "#4ade80", "#fff"]));
      scoreRef.current += UFO_SCORES[ufo.size];
    }
    setScore(scoreRef.current);
    asteroidsRef.current = [];
    ufosRef.current = [];
  }, [soundEnabled, playSound, spawnParticles]);

  const startGame = useCallback(() => {
    setCountdown(3);
    setGameState("countdown");
    gameStateRef.current = "countdown";

    // Reset game state
    shipRef.current = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, angle: -90, velocityX: 0, velocityY: 0, rotationVelocity: 0, thrustLevel: 0 };
    bulletsRef.current = [];
    ufosRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    shipTrailRef.current = [];
    scoreRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    levelRef.current = 1;
    invulnerableRef.current = INVULNERABLE_TIME;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    shieldTimerRef.current = 0;
    rapidFireTimerRef.current = 0;
    lastUfoSpawnRef.current = 0;
    totalKillsRef.current = 0;
    maxComboRef.current = 0;

    // Spawn initial asteroids
    asteroidsRef.current = spawnAsteroids(4);

    setShip({ ...shipRef.current });
    setBullets([]);
    setAsteroids([...asteroidsRef.current]);
    setUfos([]);
    setPowerUps([]);
    setParticles([]);
    setShipTrail([]);
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setCombo(0);
    setShieldActive(false);
    setRapidFireActive(false);
  }, [spawnAsteroids]);

  // Countdown timer
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

  const shoot = useCallback(() => {
    const now = Date.now();
    const cooldown = rapidFireTimerRef.current > 0 ? 80 : 180;
    if (now - lastShotRef.current < cooldown) return;
    lastShotRef.current = now;

    const angle = (shipRef.current.angle * Math.PI) / 180;
    const bullet: Bullet = {
      id: bulletIdRef.current++,
      x: shipRef.current.x + Math.cos(angle) * SHIP_SIZE,
      y: shipRef.current.y + Math.sin(angle) * SHIP_SIZE,
      velocityX: Math.cos(angle) * BULLET_SPEED + shipRef.current.velocityX * 0.3,
      velocityY: Math.sin(angle) * BULLET_SPEED + shipRef.current.velocityY * 0.3,
      life: BULLET_LIFE,
    };
    bulletsRef.current.push(bullet);
    if (soundEnabled) playSound("shoot");
  }, [soundEnabled, playSound]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === "playing") {
      setGameState("paused");
      gameStateRef.current = "paused";
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      gameStateRef.current = "playing";
    }
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") return;

    const gameLoop = () => {
      const currentState = gameStateRef.current;

      // Update stars (parallax)
      stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) star.x = GAME_WIDTH;
      });

      if (currentState === "countdown") {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (currentState !== "playing") return;

      const keys = keysRef.current;

      // Ship rotation with smooth acceleration
      const rotatingLeft = keys.has("ArrowLeft") || keys.has("KeyA") || mobileLeft;
      const rotatingRight = keys.has("ArrowRight") || keys.has("KeyD") || mobileRight;

      if (rotatingLeft) {
        shipRef.current.rotationVelocity -= ROTATION_ACCELERATION;
      }
      if (rotatingRight) {
        shipRef.current.rotationVelocity += ROTATION_ACCELERATION;
      }

      // Clamp rotation speed
      shipRef.current.rotationVelocity = Math.max(-MAX_ROTATION_SPEED, Math.min(MAX_ROTATION_SPEED, shipRef.current.rotationVelocity));

      // Apply rotation friction when not actively rotating
      if (!rotatingLeft && !rotatingRight) {
        shipRef.current.rotationVelocity *= ROTATION_FRICTION;
      }

      // Apply rotation
      shipRef.current.angle += shipRef.current.rotationVelocity;

      // Ship thrust (keyboard + mobile)
      const isThrusting = keys.has("ArrowUp") || keys.has("KeyW") || mobileThrust;
      const isBraking = keys.has("ArrowDown") || keys.has("KeyS");
      const isStrafingLeft = keys.has("KeyQ");
      const isStrafingRight = keys.has("KeyE");

      setThrusting(isThrusting);

      // Smooth thrust level for visual effects
      if (isThrusting) {
        shipRef.current.thrustLevel = Math.min(1, shipRef.current.thrustLevel + 0.15);
      } else {
        shipRef.current.thrustLevel = Math.max(0, shipRef.current.thrustLevel - 0.1);
      }

      const angle = (shipRef.current.angle * Math.PI) / 180;

      if (isThrusting) {
        shipRef.current.velocityX += Math.cos(angle) * THRUST_POWER;
        shipRef.current.velocityY += Math.sin(angle) * THRUST_POWER;

        // Thrust particles - more when thrust level is high
        thrustFrameRef.current++;
        const particleChance = shipRef.current.thrustLevel > 0.5 ? 1 : 2;
        if (thrustFrameRef.current % particleChance === 0) {
          const thrustAngle = ((shipRef.current.angle + 180) * Math.PI) / 180;
          for (let i = 0; i < (shipRef.current.thrustLevel > 0.7 ? 2 : 1); i++) {
            const spread = (Math.random() - 0.5) * 0.6;
            const speed = 2 + Math.random() * 2 + shipRef.current.thrustLevel * 2;
            particlesRef.current.push({
              id: particleIdRef.current++,
              x: shipRef.current.x + Math.cos(thrustAngle) * 14 + (Math.random() - 0.5) * 4,
              y: shipRef.current.y + Math.sin(thrustAngle) * 14 + (Math.random() - 0.5) * 4,
              velocityX: Math.cos(thrustAngle + spread) * speed - shipRef.current.velocityX * 0.1,
              velocityY: Math.sin(thrustAngle + spread) * speed - shipRef.current.velocityY * 0.1,
              life: 15 + Math.random() * 8,
              maxLife: 20,
              color: Math.random() > 0.4 ? "#f97316" : Math.random() > 0.5 ? "#facc15" : "#fbbf24",
              size: 2 + Math.random() * 3,
            });
          }
        }

        if (thrustFrameRef.current % 6 === 0 && soundEnabled) {
          playSound("thrust");
        }
      }

      // Brake/reverse thrust
      if (isBraking) {
        const speed = Math.sqrt(shipRef.current.velocityX ** 2 + shipRef.current.velocityY ** 2);
        if (speed > 0.1) {
          shipRef.current.velocityX -= (shipRef.current.velocityX / speed) * BRAKE_POWER;
          shipRef.current.velocityY -= (shipRef.current.velocityY / speed) * BRAKE_POWER;
        }
      }

      // Strafe (side thrust)
      if (isStrafingLeft) {
        const strafeAngle = angle - Math.PI / 2;
        shipRef.current.velocityX += Math.cos(strafeAngle) * STRAFE_POWER;
        shipRef.current.velocityY += Math.sin(strafeAngle) * STRAFE_POWER;
      }
      if (isStrafingRight) {
        const strafeAngle = angle + Math.PI / 2;
        shipRef.current.velocityX += Math.cos(strafeAngle) * STRAFE_POWER;
        shipRef.current.velocityY += Math.sin(strafeAngle) * STRAFE_POWER;
      }

      // Limit speed
      const speed = Math.sqrt(shipRef.current.velocityX ** 2 + shipRef.current.velocityY ** 2);
      if (speed > MAX_SPEED) {
        shipRef.current.velocityX = (shipRef.current.velocityX / speed) * MAX_SPEED;
        shipRef.current.velocityY = (shipRef.current.velocityY / speed) * MAX_SPEED;
      }

      // Apply friction
      shipRef.current.velocityX *= FRICTION;
      shipRef.current.velocityY *= FRICTION;

      // Update ship position
      shipRef.current.x += shipRef.current.velocityX;
      shipRef.current.y += shipRef.current.velocityY;

      // Ship trail effect (based on speed)
      if (speed > 2) {
        shipTrailRef.current.push({
          id: shipTrailIdRef.current++,
          x: shipRef.current.x,
          y: shipRef.current.y,
          opacity: Math.min(0.4, speed / MAX_SPEED * 0.5),
          size: SHIP_SIZE * 0.6,
        });
      }

      // Update and clean ship trail
      shipTrailRef.current = shipTrailRef.current
        .map(t => ({ ...t, opacity: t.opacity - 0.02, size: t.size * 0.95 }))
        .filter(t => t.opacity > 0);
      setShipTrail([...shipTrailRef.current]);

      // Screen wrap for ship
      if (shipRef.current.x < -SHIP_SIZE) shipRef.current.x = GAME_WIDTH + SHIP_SIZE;
      if (shipRef.current.x > GAME_WIDTH + SHIP_SIZE) shipRef.current.x = -SHIP_SIZE;
      if (shipRef.current.y < -SHIP_SIZE) shipRef.current.y = GAME_HEIGHT + SHIP_SIZE;
      if (shipRef.current.y > GAME_HEIGHT + SHIP_SIZE) shipRef.current.y = -SHIP_SIZE;

      // Shooting (keyboard + mobile)
      if (keys.has("Space") || mobileFire) {
        shoot();
      }

      // Hyperspace
      if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
        hyperspace();
      }

      // Update timers
      if (invulnerableRef.current > 0) invulnerableRef.current--;
      if (shieldTimerRef.current > 0) {
        shieldTimerRef.current--;
        setShieldActive(true);
      } else {
        setShieldActive(false);
      }
      if (rapidFireTimerRef.current > 0) {
        rapidFireTimerRef.current--;
        setRapidFireActive(true);
      } else {
        setRapidFireActive(false);
      }

      // Combo timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current--;
        if (comboTimerRef.current === 0) {
          comboRef.current = 0;
          setCombo(0);
        }
      }

      // Spawn UFO periodically
      const now = Date.now();
      if (now - lastUfoSpawnRef.current > 15000 && ufosRef.current.length === 0) {
        lastUfoSpawnRef.current = now;
        const isSmall = levelRef.current > 2 && Math.random() > 0.6;
        const fromRight = Math.random() > 0.5;
        ufosRef.current.push({
          id: ufoIdRef.current++,
          x: fromRight ? GAME_WIDTH + 30 : -30,
          y: 50 + Math.random() * (GAME_HEIGHT - 100),
          velocityX: fromRight ? -2 : 2,
          velocityY: (Math.random() - 0.5) * 2,
          size: isSmall ? "small" : "large",
          lastShot: now,
        });
        if (soundEnabled) playSound("ufo");
      }

      // Update bullets
      bulletsRef.current = bulletsRef.current
        .map((bullet) => {
          bullet.x += bullet.velocityX;
          bullet.y += bullet.velocityY;
          bullet.life--;

          // Screen wrap
          if (bullet.x < 0) bullet.x = GAME_WIDTH;
          if (bullet.x > GAME_WIDTH) bullet.x = 0;
          if (bullet.y < 0) bullet.y = GAME_HEIGHT;
          if (bullet.y > GAME_HEIGHT) bullet.y = 0;

          return bullet;
        })
        .filter((bullet) => bullet.life > 0);

      // Update asteroids
      asteroidsRef.current = asteroidsRef.current.map((asteroid) => {
        asteroid.x += asteroid.velocityX;
        asteroid.y += asteroid.velocityY;
        asteroid.rotation += asteroid.rotationSpeed;

        // Screen wrap
        const size = ASTEROID_SIZES[asteroid.size];
        if (asteroid.x < -size) asteroid.x = GAME_WIDTH + size;
        if (asteroid.x > GAME_WIDTH + size) asteroid.x = -size;
        if (asteroid.y < -size) asteroid.y = GAME_HEIGHT + size;
        if (asteroid.y > GAME_HEIGHT + size) asteroid.y = -size;

        return asteroid;
      });

      // Update UFOs
      ufosRef.current = ufosRef.current
        .map((ufo) => {
          ufo.x += ufo.velocityX;
          ufo.y += ufo.velocityY;

          // Bounce off top/bottom
          if (ufo.y < 30 || ufo.y > GAME_HEIGHT - 30) {
            ufo.velocityY *= -1;
          }

          // Shoot at player
          const shootInterval = ufo.size === "small" ? 800 : 1500;
          if (now - ufo.lastShot > shootInterval) {
            ufo.lastShot = now;
            const angle = Math.atan2(shipRef.current.y - ufo.y, shipRef.current.x - ufo.x);
            const spread = ufo.size === "small" ? 0.1 : 0.3;
            bulletsRef.current.push({
              id: bulletIdRef.current++,
              x: ufo.x,
              y: ufo.y,
              velocityX: Math.cos(angle + (Math.random() - 0.5) * spread) * 5,
              velocityY: Math.sin(angle + (Math.random() - 0.5) * spread) * 5,
              life: 80,
              isEnemy: true,
            });
          }

          return ufo;
        })
        .filter((ufo) => ufo.x > -50 && ufo.x < GAME_WIDTH + 50);

      // Update power-ups
      powerUpsRef.current = powerUpsRef.current
        .map((p) => ({ ...p, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      // Check bullet-asteroid collisions
      const newAsteroids: Asteroid[] = [];
      bulletsRef.current = bulletsRef.current.filter((bullet) => {
        if (bullet.isEnemy) return true;

        for (let i = asteroidsRef.current.length - 1; i >= 0; i--) {
          const asteroid = asteroidsRef.current[i];
          const size = ASTEROID_SIZES[asteroid.size];
          const dx = bullet.x - asteroid.x;
          const dy = bullet.y - asteroid.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < size) {
            // Hit! Update combo
            comboRef.current++;
            comboTimerRef.current = COMBO_TIMEOUT;
            if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
            setCombo(comboRef.current);
            if (comboRef.current > 1 && soundEnabled) playSound("combo");
            totalKillsRef.current++;

            // Score with combo multiplier
            const multiplier = Math.min(comboRef.current, 5);
            scoreRef.current += ASTEROID_SCORES[asteroid.size] * multiplier;
            setScore(scoreRef.current);
            if (soundEnabled) playSound("explosion");

            // Particles
            const colors = asteroid.size === "large"
              ? ["#94a3b8", "#cbd5e1", "#64748b"]
              : asteroid.size === "medium"
              ? ["#94a3b8", "#f97316", "#cbd5e1"]
              : ["#cbd5e1", "#facc15", "#f97316"];
            particlesRef.current.push(...spawnParticles(asteroid.x, asteroid.y, asteroid.size === "large" ? 15 : asteroid.size === "medium" ? 10 : 6, colors, [2, 5]));

            // Screen flash for large asteroids
            if (asteroid.size === "large") {
              setScreenFlash("#fff");
              setTimeout(() => setScreenFlash(null), 50);
            }

            // Spawn power-up chance
            if (asteroid.size === "large") {
              spawnPowerUp(asteroid.x, asteroid.y);
            }

            // Split asteroid
            if (asteroid.size === "large") {
              newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, "medium", asteroidIdRef.current++));
              newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, "medium", asteroidIdRef.current++));
            } else if (asteroid.size === "medium") {
              newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, "small", asteroidIdRef.current++));
              newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, "small", asteroidIdRef.current++));
            }

            asteroidsRef.current.splice(i, 1);
            return false;
          }
        }
        return true;
      });

      asteroidsRef.current.push(...newAsteroids);

      // Check bullet-UFO collisions
      bulletsRef.current = bulletsRef.current.filter((bullet) => {
        if (bullet.isEnemy) return true;

        for (let i = ufosRef.current.length - 1; i >= 0; i--) {
          const ufo = ufosRef.current[i];
          const size = ufo.size === "large" ? 25 : 15;
          const dx = bullet.x - ufo.x;
          const dy = bullet.y - ufo.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < size) {
            // Hit UFO!
            comboRef.current++;
            comboTimerRef.current = COMBO_TIMEOUT;
            if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
            setCombo(comboRef.current);
            totalKillsRef.current++;

            const multiplier = Math.min(comboRef.current, 5);
            scoreRef.current += UFO_SCORES[ufo.size] * multiplier;
            setScore(scoreRef.current);
            if (soundEnabled) {
              playSound("explosion");
              playSound("combo");
            }

            particlesRef.current.push(...spawnParticles(ufo.x, ufo.y, 20, ["#22c55e", "#4ade80", "#86efac", "#fff"], [3, 6]));
            setScreenFlash("#22c55e");
            setTimeout(() => setScreenFlash(null), 80);

            // Always spawn power-up from UFO
            const types: PowerUpType[] = ["shield", "rapidfire", "extralife", "bomb"];
            powerUpsRef.current.push({
              id: powerUpIdRef.current++,
              x: ufo.x,
              y: ufo.y,
              type: types[Math.floor(Math.random() * types.length)],
              life: 500,
            });

            ufosRef.current.splice(i, 1);
            return false;
          }
        }
        return true;
      });

      // Check ship-powerup collisions
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const powerUp = powerUpsRef.current[i];
        const dx = shipRef.current.x - powerUp.x;
        const dy = shipRef.current.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < SHIP_SIZE + 15) {
          if (soundEnabled) playSound("powerup");
          particlesRef.current.push(...spawnParticles(powerUp.x, powerUp.y, 10, ["#facc15", "#fef08a", "#fff"]));

          switch (powerUp.type) {
            case "shield":
              shieldTimerRef.current = SHIELD_DURATION;
              setShieldActive(true);
              break;
            case "rapidfire":
              rapidFireTimerRef.current = RAPIDFIRE_DURATION;
              setRapidFireActive(true);
              break;
            case "extralife":
              livesRef.current++;
              setLives(livesRef.current);
              setScreenFlash("#22d3ee");
              setTimeout(() => setScreenFlash(null), 100);
              break;
            case "bomb":
              activateBomb();
              break;
          }

          powerUpsRef.current.splice(i, 1);
        }
      }

      // Check ship-asteroid collision
      const isProtected = invulnerableRef.current > 0 || shieldTimerRef.current > 0;
      if (!isProtected) {
        for (const asteroid of asteroidsRef.current) {
          const size = ASTEROID_SIZES[asteroid.size];
          const dx = shipRef.current.x - asteroid.x;
          const dy = shipRef.current.y - asteroid.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < size + SHIP_SIZE * 0.5) {
            livesRef.current--;
            setLives(livesRef.current);
            setScreenShake(true);
            setScreenFlash("#ef4444");
            setTimeout(() => {
              setScreenShake(false);
              setScreenFlash(null);
            }, 200);

            if (soundEnabled) playSound("hit");
            particlesRef.current.push(...spawnParticles(shipRef.current.x, shipRef.current.y, 20, ["#22d3ee", "#06b6d4", "#fff"], [2, 5], [2, 6]));

            // Reset combo
            comboRef.current = 0;
            setCombo(0);

            if (livesRef.current <= 0) {
              setGameState("gameover");
              gameStateRef.current = "gameover";
              if (soundEnabled) playSound("gameOver");

              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current);
                localStorage.setItem("asteroidsHighScore", scoreRef.current.toString());
              }
            } else {
              resetShip();
            }
            break;
          }
        }
      }

      // Check ship-enemy bullet collision
      if (!isProtected) {
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const bullet = bulletsRef.current[i];
          if (!bullet.isEnemy) continue;

          const dx = shipRef.current.x - bullet.x;
          const dy = shipRef.current.y - bullet.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < SHIP_SIZE) {
            bulletsRef.current.splice(i, 1);

            livesRef.current--;
            setLives(livesRef.current);
            setScreenShake(true);
            setScreenFlash("#ef4444");
            setTimeout(() => {
              setScreenShake(false);
              setScreenFlash(null);
            }, 200);

            if (soundEnabled) playSound("hit");
            particlesRef.current.push(...spawnParticles(shipRef.current.x, shipRef.current.y, 15, ["#22d3ee", "#06b6d4", "#fff"]));

            comboRef.current = 0;
            setCombo(0);

            if (livesRef.current <= 0) {
              setGameState("gameover");
              gameStateRef.current = "gameover";
              if (soundEnabled) playSound("gameOver");

              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current);
                localStorage.setItem("asteroidsHighScore", scoreRef.current.toString());
              }
            } else {
              resetShip();
            }
            break;
          }
        }
      }

      // Check for level complete
      if (asteroidsRef.current.length === 0 && ufosRef.current.length === 0) {
        levelRef.current++;
        setLevel(levelRef.current);
        if (soundEnabled) playSound("levelUp");
        setScreenFlash("#a855f7");
        setTimeout(() => setScreenFlash(null), 150);
        asteroidsRef.current = spawnAsteroids(3 + Math.min(levelRef.current, 8));
        invulnerableRef.current = INVULNERABLE_TIME;
        lastUfoSpawnRef.current = Date.now();
      }

      // Update particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.velocityX,
          y: p.y + p.velocityY,
          velocityX: p.velocityX * 0.98,
          velocityY: p.velocityY * 0.98,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);

      // Update React state for rendering
      setShip({ ...shipRef.current });
      setBullets([...bulletsRef.current]);
      setAsteroids([...asteroidsRef.current]);
      setUfos([...ufosRef.current]);
      setPowerUps([...powerUpsRef.current]);
      setParticles([...particlesRef.current]);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, soundEnabled, playSound, shoot, spawnAsteroids, spawnParticles, spawnPowerUp, resetShip, highScore, hyperspace, activateBomb, mobileThrust, mobileLeft, mobileRight, mobileFire, stars]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);

      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        if (gameStateRef.current === "playing" || gameStateRef.current === "paused") {
          togglePause();
        }
      }

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [togglePause, startGame]);

  // Render asteroid shape
  const renderAsteroidPath = (shape: number[], size: number) => {
    const points = shape.map((r, i) => {
      const angle = (i / shape.length) * Math.PI * 2;
      const x = Math.cos(angle) * size * r + size;
      const y = Math.sin(angle) * size * r + size;
      return `${x},${y}`;
    });
    return `M${points.join("L")}Z`;
  };

  const isBlinking = invulnerableRef.current > 0 && Math.floor(invulnerableRef.current / 6) % 2 === 0;
  const powerUpColors: Record<PowerUpType, string> = {
    shield: "#3b82f6",
    rapidfire: "#f97316",
    extralife: "#22c55e",
    bomb: "#ef4444",
  };
  const powerUpEmojis: Record<PowerUpType, string> = {
    shield: "🛡️",
    rapidfire: "⚡",
    extralife: "❤️",
    bomb: "💣",
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[700px] px-2">
      {/* Header Row */}
      <div className="w-full flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="px-3 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-sm
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          ← Back
        </button>

        <div className="bg-violet-500 border-4 border-black px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">ASTEROIDS</h1>
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

      {/* Stats Row */}
      <div className="flex gap-2 mb-3 flex-wrap justify-center">
        <div className="px-3 py-1.5 bg-cyan-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[80px]">
          <div className="text-[10px] font-bold text-black/70">SCORE</div>
          <div className="text-xl font-black">{score}</div>
        </div>
        <div className="px-3 py-1.5 bg-orange-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[80px]">
          <div className="text-[10px] font-bold text-black/70">BEST</div>
          <div className="text-xl font-black">{highScore}</div>
        </div>
        <div className="px-3 py-1.5 bg-lime-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[60px]">
          <div className="text-[10px] font-bold text-black/70">LEVEL</div>
          <div className="text-xl font-black">{level}</div>
        </div>
        <div className="px-3 py-1.5 bg-rose-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center min-w-[70px]">
          <div className="text-[10px] font-bold text-black/70">LIVES</div>
          <div className="text-lg font-black">{"❤️".repeat(Math.max(0, lives))}{lives > 5 ? `+${lives - 5}` : ""}</div>
        </div>
        {combo > 1 && (
          <div className="px-3 py-1.5 bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center animate-pulse">
            <div className="text-[10px] font-bold text-black/70">COMBO</div>
            <div className="text-xl font-black">x{Math.min(combo, 5)}</div>
          </div>
        )}
      </div>

      {/* Active Power-ups */}
      {(shieldActive || rapidFireActive) && (
        <div className="flex gap-2 mb-2">
          {shieldActive && (
            <div className="px-3 py-1 bg-blue-500 border-2 border-black text-white text-xs font-bold flex items-center gap-1">
              🛡️ SHIELD
            </div>
          )}
          {rapidFireActive && (
            <div className="px-3 py-1 bg-orange-500 border-2 border-black text-white text-xs font-bold flex items-center gap-1">
              ⚡ RAPID FIRE
            </div>
          )}
        </div>
      )}

      {/* Game Area */}
      <div
        className="relative border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        style={{
          width: Math.min(GAME_WIDTH, typeof window !== "undefined" ? window.innerWidth - 20 : GAME_WIDTH),
          height: GAME_HEIGHT,
          background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          transform: screenShake ? `translate(${Math.random() * 8 - 4}px, ${Math.random() * 8 - 4}px)` : undefined,
        }}
      >
        {/* Screen flash effect */}
        {screenFlash && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{ backgroundColor: screenFlash, opacity: 0.3 }}
          />
        )}

        {/* Parallax stars */}
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              backgroundColor: `rgba(255, 255, 255, ${star.brightness})`,
              boxShadow: star.size > 1.5 ? `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.brightness * 0.5})` : undefined,
            }}
          />
        ))}

        {/* Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: particle.x - particle.size / 2,
              top: particle.y - particle.size / 2,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.life / particle.maxLife,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
          />
        ))}

        {/* Power-ups */}
        {powerUps.map((powerUp) => (
          <div
            key={powerUp.id}
            className="absolute flex items-center justify-center animate-pulse"
            style={{
              left: powerUp.x - 15,
              top: powerUp.y - 15,
              width: 30,
              height: 30,
            }}
          >
            <div
              className="w-full h-full rounded-full border-2 flex items-center justify-center text-lg"
              style={{
                backgroundColor: powerUpColors[powerUp.type],
                borderColor: "#fff",
                boxShadow: `0 0 15px ${powerUpColors[powerUp.type]}`,
              }}
            >
              {powerUpEmojis[powerUp.type]}
            </div>
          </div>
        ))}

        {/* Asteroids */}
        {asteroids.map((asteroid) => {
          const size = ASTEROID_SIZES[asteroid.size];
          return (
            <svg
              key={asteroid.id}
              className="absolute"
              style={{
                left: asteroid.x - size,
                top: asteroid.y - size,
                width: size * 2,
                height: size * 2,
                transform: `rotate(${asteroid.rotation}deg)`,
                filter: "drop-shadow(0 0 3px rgba(148, 163, 184, 0.5))",
              }}
            >
              <defs>
                <linearGradient id={`asteroidGrad-${asteroid.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
              <path
                d={renderAsteroidPath(asteroid.shape, size)}
                fill={`url(#asteroidGrad-${asteroid.id})`}
                stroke="#cbd5e1"
                strokeWidth="2"
              />
            </svg>
          );
        })}

        {/* UFOs */}
        {ufos.map((ufo) => {
          const size = ufo.size === "large" ? 50 : 30;
          return (
            <div
              key={ufo.id}
              className="absolute"
              style={{
                left: ufo.x - size / 2,
                top: ufo.y - size / 2,
                width: size,
                height: size * 0.5,
              }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: "linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow: "0 0 15px #22c55e, inset 0 -5px 10px rgba(0,0,0,0.3)",
                  border: "2px solid #86efac",
                }}
              />
              <div
                className="absolute top-[-30%] left-[25%] w-[50%] h-[80%] rounded-full"
                style={{
                  background: "radial-gradient(ellipse, rgba(134, 239, 172, 0.8) 0%, rgba(34, 197, 94, 0.4) 100%)",
                  border: "1px solid #86efac",
                }}
              />
            </div>
          );
        })}

        {/* Bullets */}
        {bullets.map((bullet) => (
          <div
            key={bullet.id}
            className="absolute rounded-full"
            style={{
              left: bullet.x - 3,
              top: bullet.y - 3,
              width: 6,
              height: 6,
              backgroundColor: bullet.isEnemy ? "#ef4444" : "#facc15",
              boxShadow: bullet.isEnemy
                ? "0 0 8px #ef4444, 0 0 15px #ef4444"
                : "0 0 8px #facc15, 0 0 15px #facc15",
            }}
          />
        ))}

        {/* Ship Trail */}
        {shipTrail.map((trail) => (
          <div
            key={trail.id}
            className="absolute rounded-full"
            style={{
              left: trail.x - trail.size / 2,
              top: trail.y - trail.size / 2,
              width: trail.size,
              height: trail.size,
              background: `radial-gradient(circle, rgba(34, 211, 238, ${trail.opacity}) 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Ship */}
        {gameState !== "gameover" && (
          <div
            className="absolute"
            style={{
              left: ship.x,
              top: ship.y,
              transform: `translate(-50%, -50%) rotate(${ship.angle + 90}deg)`,
              opacity: isBlinking ? 0.3 : 1,
              filter: shieldActive
                ? "drop-shadow(0 0 15px #3b82f6) drop-shadow(0 0 30px #3b82f6)"
                : ship.thrustLevel > 0.5
                  ? "drop-shadow(0 0 8px #22d3ee)"
                  : undefined,
              transition: "filter 0.1s ease",
            }}
          >
            {/* Shield effect */}
            {shieldActive && (
              <div
                className="absolute rounded-full border-2 border-blue-400"
                style={{
                  left: -SHIP_SIZE * 0.9,
                  top: -SHIP_SIZE * 0.9,
                  width: SHIP_SIZE * 2.8,
                  height: SHIP_SIZE * 2.8,
                  background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              />
            )}

            {/* Speed lines when moving fast */}
            {Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2) > 5 && (
              <>
                <div
                  className="absolute bg-cyan-400/30"
                  style={{
                    left: SHIP_SIZE - 2,
                    top: SHIP_SIZE * 1.5,
                    width: 2,
                    height: 20,
                    transform: "translateX(-50%)",
                  }}
                />
                <div
                  className="absolute bg-cyan-400/20"
                  style={{
                    left: SHIP_SIZE - 8,
                    top: SHIP_SIZE * 1.6,
                    width: 1.5,
                    height: 15,
                  }}
                />
                <div
                  className="absolute bg-cyan-400/20"
                  style={{
                    left: SHIP_SIZE + 6,
                    top: SHIP_SIZE * 1.6,
                    width: 1.5,
                    height: 15,
                  }}
                />
              </>
            )}

            <svg width={SHIP_SIZE * 2} height={SHIP_SIZE * 2.4} viewBox="0 0 48 58">
              <defs>
                <linearGradient id="shipBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a5f3fc" />
                  <stop offset="30%" stopColor="#22d3ee" />
                  <stop offset="70%" stopColor="#0891b2" />
                  <stop offset="100%" stopColor="#0e7490" />
                </linearGradient>
                <linearGradient id="shipWingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#0891b2" />
                  <stop offset="100%" stopColor="#0e7490" />
                </linearGradient>
                <linearGradient id="cockpitGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <filter id="engineGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Main body */}
              <polygon
                points="24,0 42,50 24,42 6,50"
                fill="url(#shipBodyGrad)"
                stroke="#fff"
                strokeWidth="1.5"
              />

              {/* Wing details */}
              <polygon
                points="24,15 38,48 24,40"
                fill="url(#shipWingGrad)"
                opacity="0.6"
              />
              <polygon
                points="24,15 10,48 24,40"
                fill="url(#shipWingGrad)"
                opacity="0.6"
              />

              {/* Cockpit */}
              <ellipse
                cx="24"
                cy="18"
                rx="5"
                ry="8"
                fill="url(#cockpitGrad)"
                stroke="#a5f3fc"
                strokeWidth="1"
              />

              {/* Engine housings */}
              <rect x="8" y="42" width="6" height="8" rx="1" fill="#0e7490" stroke="#22d3ee" strokeWidth="0.5" />
              <rect x="34" y="42" width="6" height="8" rx="1" fill="#0e7490" stroke="#22d3ee" strokeWidth="0.5" />

              {/* Center detail line */}
              <line x1="24" y1="26" x2="24" y2="38" stroke="#a5f3fc" strokeWidth="1" opacity="0.5" />

              {/* Thrust flames - dynamic size based on thrust level */}
              {thrusting && gameState === "playing" && (
                <g filter="url(#engineGlow)">
                  {/* Left engine flame */}
                  <polygon
                    points={`11,50 8,${55 + ship.thrustLevel * 12} 11,${52 + ship.thrustLevel * 6} 14,${55 + ship.thrustLevel * 12}`}
                    fill="#f97316"
                  />
                  <polygon
                    points={`11,52 9,${54 + ship.thrustLevel * 8} 11,${53 + ship.thrustLevel * 4} 13,${54 + ship.thrustLevel * 8}`}
                    fill="#facc15"
                  />
                  <polygon
                    points={`11,53 10,${54 + ship.thrustLevel * 5} 11,${54 + ship.thrustLevel * 2} 12,${54 + ship.thrustLevel * 5}`}
                    fill="#fef3c7"
                  />

                  {/* Right engine flame */}
                  <polygon
                    points={`37,50 34,${55 + ship.thrustLevel * 12} 37,${52 + ship.thrustLevel * 6} 40,${55 + ship.thrustLevel * 12}`}
                    fill="#f97316"
                  />
                  <polygon
                    points={`37,52 35,${54 + ship.thrustLevel * 8} 37,${53 + ship.thrustLevel * 4} 39,${54 + ship.thrustLevel * 8}`}
                    fill="#facc15"
                  />
                  <polygon
                    points={`37,53 36,${54 + ship.thrustLevel * 5} 37,${54 + ship.thrustLevel * 2} 38,${54 + ship.thrustLevel * 5}`}
                    fill="#fef3c7"
                  />

                  {/* Center engine (main) flame */}
                  <polygon
                    points={`24,44 18,${56 + ship.thrustLevel * 15} 24,${50 + ship.thrustLevel * 8} 30,${56 + ship.thrustLevel * 15}`}
                    fill="#f97316"
                  />
                  <polygon
                    points={`24,46 20,${54 + ship.thrustLevel * 10} 24,${49 + ship.thrustLevel * 5} 28,${54 + ship.thrustLevel * 10}`}
                    fill="#facc15"
                  />
                  <polygon
                    points={`24,48 22,${52 + ship.thrustLevel * 6} 24,${50 + ship.thrustLevel * 3} 26,${52 + ship.thrustLevel * 6}`}
                    fill="#fef3c7"
                  />
                </g>
              )}

              {/* Engine idle glow */}
              {!thrusting && gameState === "playing" && (
                <>
                  <circle cx="11" cy="50" r="2" fill="#0891b2" opacity="0.6" />
                  <circle cx="37" cy="50" r="2" fill="#0891b2" opacity="0.6" />
                  <circle cx="24" cy="46" r="2.5" fill="#0891b2" opacity="0.6" />
                </>
              )}
            </svg>
          </div>
        )}

        {/* Menu Overlay */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-4 border-violet-500 p-6 text-center max-w-sm w-full shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <div className="text-5xl mb-3">🚀</div>
              <h2 className="text-3xl font-black text-white mb-2">ASTEROIDS</h2>
              <p className="text-slate-400 font-bold mb-4 text-sm">
                Destroy asteroids, collect power-ups, and survive!
              </p>
              <div className="bg-slate-800 border-2 border-slate-600 p-3 mb-4 text-left text-xs">
                <div className="text-slate-300 font-bold space-y-1">
                  <div>← → or A D : Rotate (smooth)</div>
                  <div>↑ or W : Thrust forward</div>
                  <div>↓ or S : Brake</div>
                  <div>Q / E : Strafe left/right</div>
                  <div>SPACE : Shoot</div>
                  <div>SHIFT : Hyperspace (teleport)</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mb-4 text-xs">
                <div className="px-2 py-1 bg-blue-500/30 border border-blue-500 text-blue-300 rounded">🛡️ Shield</div>
                <div className="px-2 py-1 bg-orange-500/30 border border-orange-500 text-orange-300 rounded">⚡ Rapid</div>
                <div className="px-2 py-1 bg-green-500/30 border border-green-500 text-green-300 rounded">❤️ Life</div>
                <div className="px-2 py-1 bg-red-500/30 border border-red-500 text-red-300 rounded">💣 Bomb</div>
              </div>
              <button
                onClick={startGame}
                className="w-full bg-violet-600 border-4 border-violet-400 px-6 py-3 font-black text-xl text-white
                  hover:bg-violet-500 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              >
                START GAME
              </button>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div
              className="text-8xl font-black text-white animate-pulse"
              style={{ textShadow: "0 0 30px #a855f7, 0 0 60px #a855f7" }}
            >
              {countdown === 0 ? "GO!" : countdown}
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-slate-900 border-4 border-violet-500 p-8 text-center">
              <h2 className="text-4xl font-black text-white mb-4">PAUSED</h2>
              <p className="text-slate-400 font-bold mb-4">Press P or ESC to resume</p>
              <button
                onClick={togglePause}
                className="bg-violet-600 border-4 border-violet-400 px-8 py-3 font-black text-xl text-white
                  hover:bg-violet-500 transition-colors"
              >
                RESUME
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-4 border-rose-500 p-6 text-center max-w-sm w-full">
              <h2 className="text-4xl font-black text-rose-500 mb-2">GAME OVER</h2>
              <div className="text-5xl font-black text-white mb-3">{score}</div>

              {score > 0 && score >= highScore && (
                <div className="text-yellow-400 font-black mb-3 text-xl animate-pulse">🎉 NEW HIGH SCORE!</div>
              )}

              <div className="bg-slate-800 border-2 border-slate-600 p-3 mb-4 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Level Reached:</span>
                  <span className="font-black text-lime-400">{level}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Kills:</span>
                  <span className="font-black text-cyan-400">{totalKillsRef.current}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Max Combo:</span>
                  <span className="font-black text-yellow-400">x{maxComboRef.current}</span>
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-violet-600 border-4 border-violet-400 px-6 py-3 font-black text-xl text-white
                  hover:bg-violet-500 transition-colors"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 flex gap-4 sm:hidden">
        {/* Left side - movement */}
        <div className="flex flex-col items-center gap-2">
          <button
            onTouchStart={() => setMobileThrust(true)}
            onTouchEnd={() => setMobileThrust(false)}
            onMouseDown={() => setMobileThrust(true)}
            onMouseUp={() => setMobileThrust(false)}
            onMouseLeave={() => setMobileThrust(false)}
            className={`w-14 h-14 rounded-full border-4 border-black font-black text-2xl flex items-center justify-center
              ${mobileThrust ? "bg-orange-500" : "bg-orange-400"} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          >
            🔥
          </button>
          <div className="flex gap-2">
            <button
              onTouchStart={() => setMobileLeft(true)}
              onTouchEnd={() => setMobileLeft(false)}
              onMouseDown={() => setMobileLeft(true)}
              onMouseUp={() => setMobileLeft(false)}
              onMouseLeave={() => setMobileLeft(false)}
              className={`w-12 h-12 rounded-lg border-4 border-black font-black text-xl flex items-center justify-center
                ${mobileLeft ? "bg-slate-500" : "bg-slate-400"} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
            >
              ←
            </button>
            <button
              onTouchStart={() => setMobileRight(true)}
              onTouchEnd={() => setMobileRight(false)}
              onMouseDown={() => setMobileRight(true)}
              onMouseUp={() => setMobileRight(false)}
              onMouseLeave={() => setMobileRight(false)}
              className={`w-12 h-12 rounded-lg border-4 border-black font-black text-xl flex items-center justify-center
                ${mobileRight ? "bg-slate-500" : "bg-slate-400"} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
            >
              →
            </button>
          </div>
        </div>

        {/* Right side - actions */}
        <div className="flex flex-col items-center gap-2">
          <button
            onTouchStart={() => setMobileFire(true)}
            onTouchEnd={() => setMobileFire(false)}
            onMouseDown={() => setMobileFire(true)}
            onMouseUp={() => setMobileFire(false)}
            onMouseLeave={() => setMobileFire(false)}
            className={`w-16 h-16 rounded-full border-4 border-black font-black text-2xl flex items-center justify-center
              ${mobileFire ? "bg-red-600" : "bg-red-500"} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          >
            💥
          </button>
          <button
            onClick={hyperspace}
            className="w-12 h-12 rounded-lg border-4 border-black font-black text-xl flex items-center justify-center
              bg-purple-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:bg-purple-600"
          >
            ✨
          </button>
        </div>
      </div>

      {/* Desktop Controls Info */}
      <div className="mt-3 px-4 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center hidden sm:block">
        <span className="font-bold text-xs">
          ← → Rotate • ↑ Thrust • ↓ Brake • Q/E Strafe • SPACE Shoot • SHIFT Warp
        </span>
      </div>

      {/* Score Guide */}
      <div className="mt-2 flex gap-2 flex-wrap justify-center">
        <div className="px-2 py-1 bg-slate-600 border-2 border-black text-white text-[10px] font-bold">Large: 20</div>
        <div className="px-2 py-1 bg-slate-500 border-2 border-black text-white text-[10px] font-bold">Medium: 50</div>
        <div className="px-2 py-1 bg-slate-400 border-2 border-black text-white text-[10px] font-bold">Small: 100</div>
        <div className="px-2 py-1 bg-green-500 border-2 border-black text-white text-[10px] font-bold">UFO: 200-1000</div>
      </div>
    </div>
  );
}
