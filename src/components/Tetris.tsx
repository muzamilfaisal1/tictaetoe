"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ==================== TYPES ====================
type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";
type Cell = string | null;
type Grid = Cell[][];
type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

interface Tetromino {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// ==================== CONSTANTS ====================
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const CELL_SIZE = 24;
const PREVIEW_CELL_SIZE = 16;

const LEVEL_SPEEDS = [
  800, 720, 640, 560, 480, 400, 350, 300, 250, 200,
  180, 160, 140, 120, 100, 90, 80, 70, 60, 50
];

const LINE_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

const DAS_DELAY = 170;
const ARR_DELAY = 50;

// ==================== TETROMINO DEFINITIONS ====================
const TETROMINOES: Record<TetrominoType, { shapes: number[][][]; color: string }> = {
  I: {
    shapes: [
      [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
      [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
      [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
      [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]],
    ],
    color: "#06b6d4",
  },
  O: {
    shapes: [
      [[1,1], [1,1]],
      [[1,1], [1,1]],
      [[1,1], [1,1]],
      [[1,1], [1,1]],
    ],
    color: "#eab308",
  },
  T: {
    shapes: [
      [[0,1,0], [1,1,1], [0,0,0]],
      [[0,1,0], [0,1,1], [0,1,0]],
      [[0,0,0], [1,1,1], [0,1,0]],
      [[0,1,0], [1,1,0], [0,1,0]],
    ],
    color: "#a855f7",
  },
  S: {
    shapes: [
      [[0,1,1], [1,1,0], [0,0,0]],
      [[0,1,0], [0,1,1], [0,0,1]],
      [[0,0,0], [0,1,1], [1,1,0]],
      [[1,0,0], [1,1,0], [0,1,0]],
    ],
    color: "#22c55e",
  },
  Z: {
    shapes: [
      [[1,1,0], [0,1,1], [0,0,0]],
      [[0,0,1], [0,1,1], [0,1,0]],
      [[0,0,0], [1,1,0], [0,1,1]],
      [[0,1,0], [1,1,0], [1,0,0]],
    ],
    color: "#ef4444",
  },
  J: {
    shapes: [
      [[1,0,0], [1,1,1], [0,0,0]],
      [[0,1,1], [0,1,0], [0,1,0]],
      [[0,0,0], [1,1,1], [0,0,1]],
      [[0,1,0], [0,1,0], [1,1,0]],
    ],
    color: "#3b82f6",
  },
  L: {
    shapes: [
      [[0,0,1], [1,1,1], [0,0,0]],
      [[0,1,0], [0,1,0], [0,1,1]],
      [[0,0,0], [1,1,1], [1,0,0]],
      [[1,1,0], [0,1,0], [0,1,0]],
    ],
    color: "#f97316",
  },
};

// ==================== WALL KICKS (SRS) ====================
const WALL_KICKS_JLSTZ: Record<string, { x: number; y: number }[]> = {
  "0>1": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  "1>0": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  "1>2": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  "2>1": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  "2>3": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  "3>2": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  "3>0": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  "0>3": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
};

const WALL_KICKS_I: Record<string, { x: number; y: number }[]> = {
  "0>1": [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  "1>0": [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  "1>2": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
  "2>1": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  "2>3": [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  "3>2": [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  "3>0": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  "0>3": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
};

// ==================== HELPER FUNCTIONS ====================
function createEmptyGrid(): Grid {
  return Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
}

function getShape(type: TetrominoType, rotation: number): number[][] {
  return TETROMINOES[type].shapes[rotation];
}

function isValidPosition(grid: Grid, shape: number[][], x: number, y: number): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT) {
          return false;
        }
        if (newY >= 0 && grid[newY][newX] !== null) {
          return false;
        }
      }
    }
  }
  return true;
}

function calculateGhostY(grid: Grid, piece: Tetromino): number {
  const shape = getShape(piece.type, piece.rotation);
  let ghostY = piece.y;
  while (isValidPosition(grid, shape, piece.x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

// ==================== SOUND HOOK ====================
function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: "move" | "rotate" | "drop" | "hardDrop" | "lock" | "lineClear" | "tetris" | "levelUp" | "hold" | "gameOver") => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case "move":
          oscillator.frequency.value = 200;
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.05, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
          oscillator.start(now);
          oscillator.stop(now + 0.03);
          break;
        case "rotate":
          oscillator.frequency.setValueAtTime(300, now);
          oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;
        case "drop":
          oscillator.frequency.value = 150;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.03, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
          oscillator.start(now);
          oscillator.stop(now + 0.02);
          break;
        case "hardDrop":
          oscillator.frequency.setValueAtTime(100, now);
          oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.15);
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
        case "lock":
          oscillator.frequency.value = 180;
          oscillator.type = "square";
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          oscillator.start(now);
          oscillator.stop(now + 0.08);
          break;
        case "lineClear":
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.setValueAtTime(600, now + 0.07);
          oscillator.frequency.setValueAtTime(800, now + 0.14);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
        case "tetris":
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.setValueAtTime(500, now + 0.1);
          oscillator.frequency.setValueAtTime(600, now + 0.2);
          oscillator.frequency.setValueAtTime(800, now + 0.3);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;
        case "levelUp":
          oscillator.frequency.setValueAtTime(523, now);
          oscillator.frequency.setValueAtTime(659, now + 0.08);
          oscillator.frequency.setValueAtTime(784, now + 0.16);
          oscillator.frequency.setValueAtTime(1047, now + 0.24);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;
        case "hold":
          oscillator.frequency.value = 350;
          oscillator.type = "triangle";
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
          oscillator.start(now);
          oscillator.stop(now + 0.06);
          break;
        case "gameOver":
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.6);
          oscillator.type = "sawtooth";
          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          oscillator.start(now);
          oscillator.stop(now + 0.6);
          break;
      }
    } catch {
      // Audio not supported
    }
  }, [getAudioContext]);

  return { playSound };
}

// ==================== MAIN COMPONENT ====================
export default function Tetris({ onBack }: { onBack: () => void }) {
  // State
  const [gameState, setGameState] = useState<GameState>("menu");
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ghostY, setGhostY] = useState(0);
  const [clearingRows, setClearingRows] = useState<number[]>([]);

  // Refs for game loop
  const gridRef = useRef<Grid>(createEmptyGrid());
  const currentPieceRef = useRef<Tetromino | null>(null);
  const nextPiecesRef = useRef<TetrominoType[]>([]);
  const holdPieceRef = useRef<TetrominoType | null>(null);
  const canHoldRef = useRef(true);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesRef = useRef(0);
  const gameStateRef = useRef<GameState>("menu");
  const lastDropRef = useRef(0);
  const bagRef = useRef<TetrominoType[]>([]);
  const animationFrameRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  // DAS refs
  const keysRef = useRef<Set<string>>(new Set());
  const dasLeftRef = useRef(0);
  const dasRightRef = useRef(0);
  const lastMoveLeftRef = useRef(0);
  const lastMoveRightRef = useRef(0);

  const { playSound } = useSound();

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("tetrisHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Sync refs with state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { nextPiecesRef.current = nextPieces; }, [nextPieces]);
  useEffect(() => { holdPieceRef.current = holdPiece; }, [holdPiece]);
  useEffect(() => { canHoldRef.current = canHold; }, [canHold]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  // Update ghost position
  useEffect(() => {
    if (currentPiece && gameState === "playing") {
      setGhostY(calculateGhostY(grid, currentPiece));
    }
  }, [currentPiece, grid, gameState]);

  // 7-bag randomizer
  const getNextPiece = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      const pieces: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      bagRef.current = pieces;
    }
    return bagRef.current.pop()!;
  }, []);

  // Fill next pieces queue
  const fillNextPieces = useCallback(() => {
    const newNext = [...nextPiecesRef.current];
    while (newNext.length < 3) {
      newNext.push(getNextPiece());
    }
    setNextPieces(newNext);
    nextPiecesRef.current = newNext;
  }, [getNextPiece]);

  // Spawn piece
  const spawnPiece = useCallback((): boolean => {
    if (nextPiecesRef.current.length === 0) {
      fillNextPieces();
    }
    const type = nextPiecesRef.current[0];
    const newNext = nextPiecesRef.current.slice(1);
    newNext.push(getNextPiece());
    setNextPieces(newNext);
    nextPiecesRef.current = newNext;

    const shape = getShape(type, 0);
    const startX = Math.floor((GRID_WIDTH - shape[0].length) / 2);
    const startY = type === "I" ? -1 : 0;

    const newPiece: Tetromino = { type, x: startX, y: startY, rotation: 0 };

    if (!isValidPosition(gridRef.current, shape, startX, startY)) {
      return false; // Game over
    }

    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;
    setCanHold(true);
    canHoldRef.current = true;
    return true;
  }, [fillNextPieces, getNextPiece]);

  // Lock piece and check lines
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece) return;

    const shape = getShape(piece.type, piece.rotation);
    const color = TETROMINOES[piece.type].color;
    const newGrid = gridRef.current.map(row => [...row]);

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const y = piece.y + row;
          const x = piece.x + col;
          if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
            newGrid[y][x] = color;
          }
        }
      }
    }

    if (soundEnabled) playSound("lock");

    // Check for complete lines
    const completeRows: number[] = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      if (newGrid[row].every(cell => cell !== null)) {
        completeRows.push(row);
      }
    }

    if (completeRows.length > 0) {
      setClearingRows(completeRows);

      // Spawn particles
      const newParticles: Particle[] = [];
      completeRows.forEach(row => {
        for (let col = 0; col < GRID_WIDTH; col++) {
          const cellColor = newGrid[row][col];
          for (let i = 0; i < 3; i++) {
            newParticles.push({
              id: particleIdRef.current++,
              x: col * CELL_SIZE + CELL_SIZE / 2,
              y: row * CELL_SIZE + CELL_SIZE / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 3,
              life: 60,
              color: cellColor || "#fff",
            });
          }
        }
      });
      setParticles(prev => [...prev, ...newParticles]);
      particlesRef.current = [...particlesRef.current, ...newParticles];

      if (soundEnabled) {
        if (completeRows.length === 4) {
          playSound("tetris");
        } else {
          playSound("lineClear");
        }
      }

      // Clear lines after brief animation
      setTimeout(() => {
        const clearedGrid = newGrid.filter((_, idx) => !completeRows.includes(idx));
        while (clearedGrid.length < GRID_HEIGHT) {
          clearedGrid.unshift(Array(GRID_WIDTH).fill(null));
        }
        setGrid(clearedGrid);
        gridRef.current = clearedGrid;
        setClearingRows([]);

        // Update score and lines
        const linesCleared = completeRows.length;
        const lineScore = (LINE_SCORES[linesCleared] || 0) * levelRef.current;
        const newScore = scoreRef.current + lineScore;
        const newLines = linesRef.current + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;

        setScore(newScore);
        scoreRef.current = newScore;
        setLines(newLines);
        linesRef.current = newLines;

        if (newLevel > levelRef.current) {
          setLevel(newLevel);
          levelRef.current = newLevel;
          if (soundEnabled) playSound("levelUp");
        }

        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem("tetrisHighScore", newScore.toString());
        }

        // Spawn next piece
        if (!spawnPiece()) {
          setGameState("gameover");
          if (soundEnabled) playSound("gameOver");
        }
      }, 150);
    } else {
      setGrid(newGrid);
      gridRef.current = newGrid;

      // Spawn next piece
      if (!spawnPiece()) {
        setGameState("gameover");
        if (soundEnabled) playSound("gameOver");
      }
    }
  }, [soundEnabled, playSound, spawnPiece, highScore]);

  // Move piece
  const movePiece = useCallback((dx: number, dy: number): boolean => {
    const piece = currentPieceRef.current;
    if (!piece || gameStateRef.current !== "playing") return false;

    const shape = getShape(piece.type, piece.rotation);
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    if (isValidPosition(gridRef.current, shape, newX, newY)) {
      const newPiece = { ...piece, x: newX, y: newY };
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      if (dx !== 0 && soundEnabled) playSound("move");
      if (dy > 0 && soundEnabled) playSound("drop");
      return true;
    }
    return false;
  }, [soundEnabled, playSound]);

  // Rotate piece with wall kicks
  const rotatePiece = useCallback((direction: 1 | -1) => {
    const piece = currentPieceRef.current;
    if (!piece || gameStateRef.current !== "playing") return;

    const newRotation = (piece.rotation + direction + 4) % 4;
    const newShape = getShape(piece.type, newRotation);
    const kickKey = `${piece.rotation}>${newRotation}`;

    // O piece doesn't need kicks
    if (piece.type === "O") {
      if (isValidPosition(gridRef.current, newShape, piece.x, piece.y)) {
        const newPiece = { ...piece, rotation: newRotation };
        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
        if (soundEnabled) playSound("rotate");
      }
      return;
    }

    const kicks = piece.type === "I" ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
    const kickData = kicks[kickKey] || [{ x: 0, y: 0 }];

    for (const kick of kickData) {
      const newX = piece.x + kick.x;
      const newY = piece.y - kick.y;

      if (isValidPosition(gridRef.current, newShape, newX, newY)) {
        const newPiece = { ...piece, x: newX, y: newY, rotation: newRotation };
        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
        if (soundEnabled) playSound("rotate");
        return;
      }
    }
  }, [soundEnabled, playSound]);

  // Hard drop
  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameStateRef.current !== "playing") return;

    const shape = getShape(piece.type, piece.rotation);
    let dropY = piece.y;
    while (isValidPosition(gridRef.current, shape, piece.x, dropY + 1)) {
      dropY++;
    }

    const dropDistance = dropY - piece.y;
    const dropScore = dropDistance * 2;
    setScore(prev => prev + dropScore);
    scoreRef.current += dropScore;

    const newPiece = { ...piece, y: dropY };
    setCurrentPiece(newPiece);
    currentPieceRef.current = newPiece;

    if (soundEnabled) playSound("hardDrop");
    lockPiece();
  }, [soundEnabled, playSound, lockPiece]);

  // Hold piece
  const doHold = useCallback(() => {
    if (!canHoldRef.current || !currentPieceRef.current || gameStateRef.current !== "playing") return;

    const currentType = currentPieceRef.current.type;

    if (holdPieceRef.current) {
      // Swap with held piece
      const heldType = holdPieceRef.current;
      const shape = getShape(heldType, 0);
      const startX = Math.floor((GRID_WIDTH - shape[0].length) / 2);
      const startY = heldType === "I" ? -1 : 0;

      const newPiece: Tetromino = { type: heldType, x: startX, y: startY, rotation: 0 };
      setCurrentPiece(newPiece);
      currentPieceRef.current = newPiece;
      setHoldPiece(currentType);
      holdPieceRef.current = currentType;
    } else {
      // First hold
      setHoldPiece(currentType);
      holdPieceRef.current = currentType;
      spawnPiece();
    }

    setCanHold(false);
    canHoldRef.current = false;
    if (soundEnabled) playSound("hold");
  }, [soundEnabled, playSound, spawnPiece]);

  // Start game
  const startGame = useCallback(() => {
    setGrid(createEmptyGrid());
    gridRef.current = createEmptyGrid();
    setScore(0);
    scoreRef.current = 0;
    setLevel(1);
    levelRef.current = 1;
    setLines(0);
    linesRef.current = 0;
    setHoldPiece(null);
    holdPieceRef.current = null;
    setCanHold(true);
    canHoldRef.current = true;
    setNextPieces([]);
    nextPiecesRef.current = [];
    bagRef.current = [];
    setParticles([]);
    particlesRef.current = [];
    setClearingRows([]);

    fillNextPieces();
    setGameState("countdown");
    setCountdown(3);
  }, [fillNextPieces]);

  // Countdown effect
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameState("playing");
      spawnPiece();
      lastDropRef.current = Date.now();
    }
  }, [gameState, countdown, spawnPiece]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      const now = Date.now();

      // Handle DAS for left/right movement
      if (keysRef.current.has("ArrowLeft")) {
        if (dasLeftRef.current === 0) {
          movePiece(-1, 0);
          dasLeftRef.current = now;
          lastMoveLeftRef.current = now;
        } else if (now - dasLeftRef.current > DAS_DELAY) {
          if (now - lastMoveLeftRef.current > ARR_DELAY) {
            movePiece(-1, 0);
            lastMoveLeftRef.current = now;
          }
        }
      } else {
        dasLeftRef.current = 0;
      }

      if (keysRef.current.has("ArrowRight")) {
        if (dasRightRef.current === 0) {
          movePiece(1, 0);
          dasRightRef.current = now;
          lastMoveRightRef.current = now;
        } else if (now - dasRightRef.current > DAS_DELAY) {
          if (now - lastMoveRightRef.current > ARR_DELAY) {
            movePiece(1, 0);
            lastMoveRightRef.current = now;
          }
        }
      } else {
        dasRightRef.current = 0;
      }

      // Soft drop
      if (keysRef.current.has("ArrowDown")) {
        const softDropSpeed = 50;
        if (now - lastDropRef.current > softDropSpeed) {
          if (movePiece(0, 1)) {
            setScore(prev => prev + 1);
            scoreRef.current += 1;
          }
          lastDropRef.current = now;
        }
      } else {
        // Normal gravity
        const speed = LEVEL_SPEEDS[Math.min(levelRef.current - 1, LEVEL_SPEEDS.length - 1)];
        if (now - lastDropRef.current > speed) {
          if (!movePiece(0, 1)) {
            lockPiece();
          }
          lastDropRef.current = now;
        }
      }

      // Update particles
      const updatedParticles = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 1,
        }))
        .filter(p => p.life > 0);
      particlesRef.current = updatedParticles;
      setParticles(updatedParticles);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, movePiece, lockPiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === "playing") {
        keysRef.current.add(e.key);

        if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") {
          e.preventDefault();
          rotatePiece(1);
        } else if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          rotatePiece(-1);
        } else if (e.key === " ") {
          e.preventDefault();
          hardDrop();
        } else if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          doHold();
        } else if (e.key === "Escape" || e.key === "p" || e.key === "P") {
          e.preventDefault();
          setGameState("paused");
        }
      } else if (gameStateRef.current === "paused") {
        if (e.key === "Escape" || e.key === "p" || e.key === "P") {
          e.preventDefault();
          setGameState("playing");
          lastDropRef.current = Date.now();
        }
      } else if (gameStateRef.current === "menu" || gameStateRef.current === "gameover") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [rotatePiece, hardDrop, doHold, startGame]);

  // Render tetromino preview
  const renderPreview = (type: TetrominoType, cellSize: number) => {
    const shape = getShape(type, 0);
    const color = TETROMINOES[type].color;
    return (
      <div className="relative" style={{ width: shape[0].length * cellSize, height: shape.length * cellSize }}>
        {shape.map((row, rowIdx) =>
          row.map((cell, colIdx) =>
            cell ? (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="absolute border border-black/30"
                style={{
                  left: colIdx * cellSize,
                  top: rowIdx * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: color,
                  boxShadow: `inset 2px 2px 2px rgba(255,255,255,0.3), inset -2px -2px 2px rgba(0,0,0,0.3)`,
                }}
              />
            ) : null
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Top Bar */}
      <div className="flex items-center gap-2 mb-2 w-full max-w-md justify-between px-2">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-sm"
        >
          ← Back
        </button>
        <div className="bg-cyan-400 border-4 border-black px-4 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1">
          <h1 className="text-xl font-black">TETRIS</h1>
        </div>
        <div className="flex gap-1">
          {gameState === "playing" && (
            <button
              onClick={() => setGameState("paused")}
              className="w-10 h-10 bg-yellow-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold
                hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all text-lg"
            >
              ⏸
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 bg-white border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold
              hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all text-lg"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-2 mb-2 text-xs font-bold">
        <div className="bg-lime-400 border-3 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          SCORE: {score}
        </div>
        <div className="bg-rose-400 border-3 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          HIGH: {highScore}
        </div>
        <div className="bg-cyan-400 border-3 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          LV: {level}
        </div>
        <div className="bg-violet-400 border-3 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          LINES: {lines}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex gap-2 items-start">
        {/* Left Panel - Hold */}
        <div className="flex flex-col gap-2">
          <div className="bg-gray-800 border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-white text-xs font-bold mb-1 text-center">HOLD</div>
            <div className="w-16 h-16 bg-gray-900 border-2 border-gray-700 flex items-center justify-center">
              {holdPiece && renderPreview(holdPiece, PREVIEW_CELL_SIZE)}
            </div>
          </div>
        </div>

        {/* Center - Game Grid */}
        <div
          className="relative bg-gray-900 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          style={{ width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE }}
        >
          {/* Grid background */}
          {Array(GRID_HEIGHT).fill(null).map((_, row) =>
            Array(GRID_WIDTH).fill(null).map((_, col) => (
              <div
                key={`bg-${row}-${col}`}
                className="absolute border border-gray-800"
                style={{
                  left: col * CELL_SIZE,
                  top: row * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              />
            ))
          )}

          {/* Placed pieces */}
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) =>
              cell ? (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className={`absolute border border-black/30 ${clearingRows.includes(rowIdx) ? "animate-pulse bg-white" : ""}`}
                  style={{
                    left: colIdx * CELL_SIZE,
                    top: rowIdx * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: clearingRows.includes(rowIdx) ? "#fff" : cell,
                    boxShadow: `inset 2px 2px 2px rgba(255,255,255,0.3), inset -2px -2px 2px rgba(0,0,0,0.3)`,
                  }}
                />
              ) : null
            )
          )}

          {/* Ghost piece */}
          {currentPiece && gameState === "playing" && (
            <>
              {getShape(currentPiece.type, currentPiece.rotation).map((row, rowIdx) =>
                row.map((cell, colIdx) =>
                  cell ? (
                    <div
                      key={`ghost-${rowIdx}-${colIdx}`}
                      className="absolute border-2 border-dashed"
                      style={{
                        left: (currentPiece.x + colIdx) * CELL_SIZE,
                        top: (ghostY + rowIdx) * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderColor: TETROMINOES[currentPiece.type].color,
                        opacity: 0.3,
                      }}
                    />
                  ) : null
                )
              )}
            </>
          )}

          {/* Current piece */}
          {currentPiece && gameState === "playing" && (
            <>
              {getShape(currentPiece.type, currentPiece.rotation).map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const y = currentPiece.y + rowIdx;
                  return cell && y >= 0 ? (
                    <div
                      key={`current-${rowIdx}-${colIdx}`}
                      className="absolute border border-black/30"
                      style={{
                        left: (currentPiece.x + colIdx) * CELL_SIZE,
                        top: y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: TETROMINOES[currentPiece.type].color,
                        boxShadow: `inset 2px 2px 2px rgba(255,255,255,0.3), inset -2px -2px 2px rgba(0,0,0,0.3)`,
                      }}
                    />
                  ) : null;
                })
              )}
            </>
          )}

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: p.x,
                top: p.y,
                width: 4,
                height: 4,
                backgroundColor: p.color,
                opacity: p.life / 60,
              }}
            />
          ))}

          {/* Menu Overlay */}
          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
              <div className="bg-cyan-400 border-4 border-black px-4 py-2 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-2xl font-black">TETRIS</div>
              </div>
              <button
                onClick={startGame}
                className="bg-lime-400 border-4 border-black px-6 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all mb-4"
              >
                START
              </button>
              <div className="text-white text-xs text-center space-y-1">
                <p>← → Move</p>
                <p>↓ Soft Drop</p>
                <p>↑/X Rotate CW</p>
                <p>Z Rotate CCW</p>
                <p>Space Hard Drop</p>
                <p>C Hold</p>
              </div>
            </div>
          )}

          {/* Countdown Overlay */}
          {gameState === "countdown" && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-6xl font-black text-white animate-pulse">
                {countdown || "GO!"}
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {gameState === "paused" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
              <div className="bg-yellow-400 border-4 border-black px-4 py-2 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xl font-black">PAUSED</div>
              </div>
              <button
                onClick={() => { setGameState("playing"); lastDropRef.current = Date.now(); }}
                className="bg-lime-400 border-4 border-black px-4 py-1.5 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all mb-2"
              >
                RESUME
              </button>
              <button
                onClick={startGame}
                className="bg-rose-400 border-4 border-black px-4 py-1.5 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                RESTART
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === "gameover" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
              <div className="bg-rose-500 border-4 border-black px-4 py-2 mb-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xl font-black text-white">GAME OVER</div>
              </div>
              <div className="text-white text-sm font-bold mb-1">Score: {score}</div>
              <div className="text-yellow-400 text-sm font-bold mb-3">Best: {highScore}</div>
              <button
                onClick={startGame}
                className="bg-lime-400 border-4 border-black px-4 py-1.5 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Next */}
        <div className="flex flex-col gap-2">
          <div className="bg-gray-800 border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-white text-xs font-bold mb-1 text-center">NEXT</div>
            <div className="space-y-2">
              {nextPieces.slice(0, 3).map((type, idx) => (
                <div
                  key={idx}
                  className="w-16 h-12 bg-gray-900 border-2 border-gray-700 flex items-center justify-center"
                >
                  {renderPreview(type, PREVIEW_CELL_SIZE)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="flex gap-4 mt-3 sm:hidden">
        {/* Left side - Movement */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <button
              onTouchStart={() => movePiece(-1, 0)}
              className="w-12 h-12 bg-white border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xl
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              ←
            </button>
            <button
              onTouchStart={() => movePiece(1, 0)}
              className="w-12 h-12 bg-white border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xl
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              →
            </button>
          </div>
          <button
            onTouchStart={() => { keysRef.current.add("ArrowDown"); }}
            onTouchEnd={() => { keysRef.current.delete("ArrowDown"); }}
            className="w-12 h-12 bg-cyan-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xl
              active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            ↓
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <button
              onTouchStart={() => rotatePiece(-1)}
              className="w-12 h-12 bg-violet-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-sm
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              CCW
            </button>
            <button
              onTouchStart={() => rotatePiece(1)}
              className="w-12 h-12 bg-violet-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-sm
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              CW
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onTouchStart={hardDrop}
              className="w-12 h-12 bg-rose-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xs
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              DROP
            </button>
            <button
              onTouchStart={doHold}
              className="w-12 h-12 bg-yellow-400 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-xs
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              HOLD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
