/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, PlayerCar, Obstacle, ObstacleType, Decoration, Particle, FloatText, ScoreData, getLevelConfigByScore, LevelConfig } from '../types';
import { audio } from '../utils/audio';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Zap, Award, Flame, Navigation, AlertTriangle, Home, Trophy } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  selectedColor: string;
  onGameOver: (finalScore: number, finalStats: ScoreData) => void;
  onScoreUpdate: (score: number, speed: number, distance: number, health: number, nitro: number) => void;
}

// Fixed Logical Size for consistent game calculations
const LOGICAL_WIDTH = 500;
const LOGICAL_HEIGHT = 800;

export default function GameCanvas({
  gameState,
  setGameState,
  selectedColor,
  onGameOver,
  onScoreUpdate,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sound state
  const [isMuted, setIsMuted] = useState(true);

  // Reference for game loop tick animation
  const animationFrameIdRef = useRef<number | null>(null);

  // Key tracking
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Game state references (to avoid React re-render lag inside the tight requestAnimationFrame)
  const scoreRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  const carsOvertakenRef = useRef<number>(0);
  const coinsCountRef = useRef<number>(0);
  const consecutiveCombosRef = useRef<number>(0);
  const comboMultiplierRef = useRef<number>(1);
  const playerRef = useRef<PlayerCar>({
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT - 130,
    targetX: LOGICAL_WIDTH / 2,
    lane: 1,
    width: 44,
    height: 76,
    color: selectedColor,
    speed: 0,
    targetSpeed: 100, // Speed in px/s or mapped ratio
    maxSpeed: 210, // Max standard speed or upgraded
    accel: 1.8,
    nitroActive: false,
    nitroGauge: 60,
    steerProgress: 0,
    angle: 0,
    health: 100,
    invincibleTime: 0,
    skidTime: 0,
  });

  // Track dynamic lane positions helper
  const firstLaneCenter = 145;
  const laneGap = 105;
  const laneCenters = [
    firstLaneCenter, // Lane 0
    firstLaneCenter + laneGap, // Lane 1
    firstLaneCenter + laneGap * 2, // Lane 2
  ];

  // Obstacles, scenery & visual buffers
  const obstaclesRef = useRef<Obstacle[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);
  const screenShakeRef = useRef<number>(0);
  const roadOffsetRef = useRef<number>(0);

  // Spawner intervals
  const lastLevelRef = useRef<number>(1);
  const obstacleSpawnTimerRef = useRef<number>(0);
  const decorationSpawnTimerRef = useRef<number>(0);

  // Refs to stabilize props and mutable states for stable startGameCallback dependency
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const selectedColorRef = useRef(selectedColor);
  const isMutedRef = useRef(isMuted);
  const setGameStateRef = useRef(setGameState);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
    playerRef.current.color = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setGameStateRef.current = setGameState;
  }, [setGameState]);

  // Audio Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.toggle(!nextMuted);
  };

  // Create roadside decorations initially
  const initDecorations = () => {
    const list: Decoration[] = [];
    const colors = ['#15803d', '#166534', '#047857', '#0f766e', '#451a03', '#1e293b'];
    // Fill up initial landscape parallax
    for (let y = 0; y < LOGICAL_HEIGHT; y += 120) {
      const side = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      const sizeList = [25, 35, 45];
      const size = sizeList[Math.floor(Math.random() * sizeList.length)];
      const sideMargin = 70;
      const x = side === 'LEFT' 
        ? Math.random() * (sideMargin - 10) 
        : LOGICAL_WIDTH - sideMargin + 10 + Math.random() * (sideMargin - 15);
      
      const types: Array<'TREE' | 'BUSH' | 'ROCK'> = ['TREE', 'BUSH', 'ROCK'];
      list.push({
        id: Math.random().toString(),
        x,
        y,
        type: types[Math.floor(Math.random() * types.length)],
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        parallaxSpeed: 0.85,
        side,
      });
    }
    decorationsRef.current = list;
  };

  // Emit dynamic text popup helper
  const addFloatText = (x: number, y: number, text: string, color: string = '#facc15', scale: number = 1.0) => {
    floatTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1.0,
      scale,
      vy: -1.5,
    });
  };

  // Spark and smoke particles emitter
  const addSparks = (x: number, y: number, color: string = '#f97316', count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const force = 1.5 + Math.random() * 4;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 1.0, // push upwards slightly relative to scrolling
        size: 2 + Math.random() * 4,
        color,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.04,
        type: 'SPARK',
      });
    }
  };

  const addSmoke = (x: number, y: number, color: string = 'rgba(203, 213, 225, 0.4)', count: number = 1) => {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = 0.5 + Math.random() * 1.5; // drift backward matching relative road scroll
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx,
        vy,
        size: 6 + Math.random() * 10,
        color,
        alpha: 0.6,
        decay: 0.015 + Math.random() * 0.02,
        type: 'SMOKE',
      });
    }
  };

  // Start / restart game loop setup
  const startGame = useCallback(() => {
    scoreRef.current = 0;
    distanceRef.current = 0;
    carsOvertakenRef.current = 0;
    coinsCountRef.current = 0;
    consecutiveCombosRef.current = 0;
    comboMultiplierRef.current = 1;

    playerRef.current = {
      x: laneCenters[1],
      y: LOGICAL_HEIGHT - 130,
      targetX: laneCenters[1],
      lane: 1,
      width: 44,
      height: 76,
      color: selectedColorRef.current,
      speed: 0,
      targetSpeed: 100,
      maxSpeed: 215,
      accel: 1.8,
      nitroActive: false,
      nitroGauge: 60,
      steerProgress: 0,
      angle: 0,
      health: 100,
      invincibleTime: 0,
      skidTime: 0,
    };

    obstaclesRef.current = [];
    particlesRef.current = [];
    floatTextsRef.current = [];
    screenShakeRef.current = 0;
    roadOffsetRef.current = 0;
    lastLevelRef.current = 1;
    obstacleSpawnTimerRef.current = 0;
    decorationSpawnTimerRef.current = 0;

    initDecorations();
    setGameStateRef.current('PLAYING');

    // Instantly dispatch initial state stats to reset displays correctly
    onScoreUpdateRef.current(0, 0, 0, 100, 60);

    // Trigger audio engine if unmuted
    if (!isMutedRef.current) {
      audio.init();
      audio.toggle(true);
    }
  }, []);

  // Handle steering inputs
  const steerTo = (lane: number) => {
    if (gameState !== 'PLAYING') return;
    const boundedLane = Math.min(2, Math.max(0, lane));
    const previousLane = playerRef.current.lane;
    
    if (boundedLane !== previousLane) {
      playerRef.current.lane = boundedLane;
      playerRef.current.targetX = laneCenters[boundedLane];
      // Visual tilt drift angle on rapid switch
      playerRef.current.angle = (boundedLane > previousLane ? 1 : -1) * 0.18;
      playerRef.current.skidTime = 12; // trace tyres skid
    }
  };

  // Handle key events listening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[e.key] = true;

      if (gameState === 'GAMEOVER') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      if (key === 'arrowleft' || key === 'a') {
        steerTo(playerRef.current.lane - 1);
      } else if (key === 'arrowright' || key === 'd') {
        steerTo(playerRef.current.lane + 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Main high frequency physical tick state update (60FPS loop)
  const updateGame = (dt: number) => {
    const player = playerRef.current;

    // Apply dynamic levels difficulties based on current score
    const currentLvl = getLevelConfigByScore(scoreRef.current);
    player.maxSpeed = 215 * currentLvl.speedMultiplier;
    player.accel = 1.8 * (1.0 + (currentLvl.level - 1) * 0.08);

    if (player.health <= 0) {
      // Trigger GameOver sequence
      setGameState('GAMEOVER');
      audio.stopEngine();
      if (!isMuted) {
        audio.playCrash();
      }
      onGameOver(Math.floor(scoreRef.current), {
        highScore: scoreRef.current,
        totalDistance: parseFloat(distanceRef.current.toFixed(1)),
        carsOvertaken: carsOvertakenRef.current,
        coinsCount: coinsCountRef.current,
      });
      return;
    }

    // Keyboard Continuous Throttle (Up/Down arrow or W/S keys)
    const isAccelerating = keysPressedRef.current['ArrowUp'] || keysPressedRef.current['w'] || keysPressedRef.current['W'];
    const isBraking = keysPressedRef.current['ArrowDown'] || keysPressedRef.current['s'] || keysPressedRef.current['S'];
    const wantNitro = keysPressedRef.current[' '] || isAccelerating; // spacebar triggers nitro if full

    // Adjust target Speed based on user actions
    let idealTargetSpeed = 100; // Idle drifting speed
    
    if (isBraking) {
      idealTargetSpeed = 40;
    } else if (isAccelerating) {
      idealTargetSpeed = player.maxSpeed - 20;
    } else {
      idealTargetSpeed = 120; // default automatic cruise
    }

    // Nitro power activation
    if (wantNitro && player.nitroGauge > 0 && !isBraking) {
      player.nitroActive = true;
      idealTargetSpeed = player.maxSpeed + 75; // Extra boost speed!
      player.nitroGauge -= 0.45; // drain gauge
      if (Math.random() > 0.4) {
        // Neon green/yellow flame emissions from pipes
        addSparks(player.x - 17, player.y + 38, '#10b981', 1);
        addSparks(player.x + 17, player.y + 38, '#06b6d4', 1);
      }
    } else {
      player.nitroActive = false;
      player.nitroGauge = Math.min(100, player.nitroGauge + 0.08); // passive slow recharge
    }

    // Accelerating interpolate speed transitions
    if (player.speed < idealTargetSpeed) {
      player.speed += player.accel * (player.nitroActive ? 2.5 : 1.0);
    } else if (player.speed > idealTargetSpeed) {
      player.speed -= player.accel * 1.5;
    }

    // Cap speed limits
    if (player.speed < 10) player.speed = 10;

    // Slide position logic (steering lerp)
    const oldX = player.x;
    player.x += (player.targetX - player.x) * 0.16;
    
    // Auto skid particles during high-speed horizontal drift
    if (Math.abs(player.x - player.targetX) > 12) {
      addSmoke(player.x - 14, player.y + 36, 'rgba(148, 163, 184, 0.2)');
      addSmoke(player.x + 14, player.y + 36, 'rgba(148, 163, 184, 0.2)');
    }

    // Smooth return to drift angle 0 when reaching lane destination
    player.angle += (0 - player.angle) * 0.12;

    // Invincibility animation blink timer
    if (player.invincibleTime > 0) {
      player.invincibleTime -= dt;
    }

    // Increment distance & scores
    const speedRatio = player.speed / player.maxSpeed;
    const actualStep = player.speed * dt;
    distanceRef.current += actualStep * 0.05; // metric scale
    scoreRef.current += actualStep * 0.1 * comboMultiplierRef.current; // dynamic score reward

    const checkScore = scoreRef.current;
    const checkLvl = getLevelConfigByScore(checkScore);
    if (checkLvl.level > lastLevelRef.current) {
      lastLevelRef.current = checkLvl.level;
      if (!isMutedRef.current) {
        audio.playLevelUp();
      }
      
      // Emit vibrant level up float texts
      addFloatText(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 120, "⚡ LEVEL UP! ⚡", "#fbbf24", 2.2);
      addFloatText(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 80, checkLvl.name.toUpperCase(), "#38bdf8", 1.5);

      // Star particles explosion in center of screen
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#a855f7'];
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = 3.0 + Math.random() * 8.0;
        particlesRef.current.push({
          id: Math.random().toString(),
          x: LOGICAL_WIDTH / 2,
          y: LOGICAL_HEIGHT / 2 - 100,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force - 1.5,
          size: 4 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.02,
          type: 'STAR',
        });
      }
    }

    // Parallax update road markers
    roadOffsetRef.current = (roadOffsetRef.current + actualStep) % 880; // 880px represents LCM of 55px (lane dash) and 80px (curb patterns) for fluid scrolling

    // Pitch audio loop mapping
    audio.updateEngine(speedRatio, player.nitroActive);

    // Dynamic Spawners based on speed
    obstacleSpawnTimerRef.current -= actualStep;
    if (obstacleSpawnTimerRef.current <= 0) {
      spawnObstacle();
      // Scalable spawn delay based on current score / distance and current level spawnDelayMultiplier
      const spawnDelayMin = 280; // slightly lower baseline minimum to support faster spawning
      const spawnDelayMax = Math.max(380, 1000 - (scoreRef.current * 0.02)) * checkLvl.spawnDelayMultiplier;
      obstacleSpawnTimerRef.current = spawnDelayMin + Math.random() * spawnDelayMax;
    }

    decorationSpawnTimerRef.current -= actualStep;
    if (decorationSpawnTimerRef.current <= 0) {
      spawnDecoration();
      decorationSpawnTimerRef.current = 150 + Math.random() * 200;
    }

    // UPDATE DECORATIONS
    decorationsRef.current.forEach((d) => {
      // scroll backwards relative to player speed
      d.y += actualStep * d.parallaxSpeed;
    });
    // Filter offscreen decorations
    decorationsRef.current = decorationsRef.current.filter((d) => d.y < LOGICAL_HEIGHT + 100);

    // UPDATE FLOAT TEXTS
    floatTextsRef.current.forEach((ft) => {
      ft.y += ft.vy;
      ft.alpha -= 0.025;
    });
    floatTextsRef.current = floatTextsRef.current.filter((ft) => ft.alpha > 0);

    // UPDATE PARTICLES
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
    });
    particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

    // UPDATE & RESOLVE OBSTACLES
    const obstacles = obstaclesRef.current;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      
      // Let standard traffic drive forward (so relative downward speed is: player_speed - traffic_speed)
      let scrollSpeed = actualStep;
      if (obs.type === 'SEDAN' || obs.type === 'SPORTS' || obs.type === 'TRUCK' || obs.type === 'POLICE') {
        const trafficSpeed = obs.speed * dt;
        scrollSpeed = actualStep - trafficSpeed;
      }

      // If bounced in crash
      if (obs.bounced) {
        obs.x += obs.bounceX;
        obs.y += obs.bounceY - 1.2;
        obs.angle += 0.08;
      } else {
        obs.y += scrollSpeed;
      }

      // Check off-screen pass (triggers scoring and statistics)
      if (obs.y > LOGICAL_HEIGHT + 150) {
        // If a vehicle is passed cleanly behind player car, count as Overtake
        if (obs.y > player.y && !obs.bounced && (obs.type === 'SEDAN' || obs.type === 'SPORTS' || obs.type === 'TRUCK' || obs.type === 'POLICE')) {
          carsOvertakenRef.current += 1;
          scoreRef.current += 150 * comboMultiplierRef.current;
          consecutiveCombosRef.current += 1;
          
          // Combo multipliers rule
          if (consecutiveCombosRef.current % 3 === 0) {
            comboMultiplierRef.current = Math.min(5, comboMultiplierRef.current + 1);
            addFloatText(240, 200, `COMBO x${comboMultiplierRef.current}!`, '#a855f7', 1.4);
          } else {
            addFloatText(obs.x, player.y - 40, 'OVERTAKE +150', '#c084fc', 1.0);
          }
        }
        obstacles.splice(i, 1);
        continue;
      }

      // FILTER OFFSCREEN TOPPED PREVIOUS OBSTACLES
      if (obs.y < -350) {
        obstacles.splice(i, 1);
        continue;
      }

      // COLLISION BOX CHECKING
      const pLeft = player.x - player.width / 2 + 3;
      const pRight = player.x + player.width / 2 - 3;
      const pTop = player.y - player.height / 2 + 5;
      const pBottom = player.y + player.height / 2 - 5;

      const oLeft = obs.x - obs.width / 2;
      const oRight = obs.x + obs.width / 2;
      const oTop = obs.y - obs.height / 2;
      const oBottom = obs.y + obs.height / 2;

      const isColliding = pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop;

      if (isColliding && !obs.bounced) {
        // Collectible items logic
        if (obs.type === 'COIN') {
          coinsCountRef.current += 1;
          scoreRef.current += 400;
          addFloatText(obs.x, obs.y - 15, 'COIN +400', '#facc15', 1.15);
          addSparks(obs.x, obs.y, '#facc15', 10);
          if (!isMuted) {
            audio.playCoin();
          }
          obstacles.splice(i, 1);
          continue;
        }

        if (obs.type === 'BOOST') {
          player.nitroGauge = Math.min(100, player.nitroGauge + 45);
          player.health = Math.min(100, player.health + 15); // repairs car slightly
          addFloatText(obs.x, obs.y - 15, 'REPAIR & NITRO! ', '#10b981', 1.25);
          addSparks(obs.x, obs.y, '#34d399', 12);
          if (!isMuted) {
            audio.playHeal();
          }
          obstacles.splice(i, 1);
          continue;
        }

        if (obs.type === 'OIL_SLICK') {
          // Slide spin effect but no direct damage
          player.angle = Math.PI * 2; // full spin!
          player.speed *= 0.82; // speed drop
          addFloatText(player.x, player.y - 40, 'SKID OUT!', '#f87171', 1.2);
          addSparks(player.x, player.y, '#000000', 8);
          if (!isMuted) {
            audio.playSlick();
          }
          obstacles.splice(i, 1);
          continue;
        }

        // PHYSICAL TRAFFIC ACCIDENT DAMAGE RESOLUTION
        if (player.invincibleTime <= 0) {
          player.health = 0; // stop game instantly on collision!
          screenShakeRef.current = 25; // massive shake UI
          consecutiveCombosRef.current = 0; // reset multiplex combos
          comboMultiplierRef.current = 1;

          let knockY = -10;
          
          // Bounce obstacle away elegantly
          obs.bounced = true;
          obs.bounceX = (obs.x < player.x ? -1 : 1) * (6 + Math.random() * 6);
          obs.bounceY = knockY - Math.random() * 6;
          
          // Emit spectacular metallic fire sparks
          addSparks((player.x + obs.x) / 2, (player.y + obs.y) / 2, '#ef4444', 30);
          if (!isMuted) {
            audio.playCrash();
          }
        }
      }
    }

    // Decay screenshakes
    if (screenShakeRef.current > 0) {
      screenShakeRef.current -= 0.55;
    }

    // Calculate display speed in KM/H: without nitro max speed of 195 maps to 40 KM/H, with nitro max speed of 290 maps to 80 KM/H
    let displaySpeed = 0;
    if (player.speed > 0) {
      if (player.speed <= 195) {
        displaySpeed = (player.speed / 195) * 40;
      } else {
        displaySpeed = 40 + ((player.speed - 195) / 95) * 40;
      }
    }

    // Callback updates upstream React hooks (throttled frequency naturally through render cycles)
    onScoreUpdate(
      Math.floor(scoreRef.current),
      Math.round(displaySpeed),
      Math.floor(distanceRef.current),
      Math.floor(player.health),
      Math.floor(player.nitroGauge)
    );
  };

  // Algorithm for spawning obstacles
  const spawnObstacle = () => {
    const lane = Math.floor(Math.random() * 3);
    const randType = Math.random();
    
    let type: ObstacleType = 'SEDAN';
    let width = 42;
    let height = 75;
    let speed = 40 + Math.random() * 30; // base speed
    let color = '#3b82f6'; // default blue

    // Randomized cars color palette
    const colors = ['#e11d48', '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#4b5563', '#1e293b'];

    if (randType < 0.15) {
      type = 'COIN';
      width = 24;
      height = 24;
      color = '#fbbf24';
      speed = 0;
    } else if (randType < 0.22) {
      type = 'BOOST';
      width = 32;
      height = 32;
      color = '#10b981';
      speed = 0;
    } else if (randType < 0.30) {
      type = 'CONE';
      width = 20;
      height = 20;
      color = '#f97316';
      speed = 0;
    } else if (randType < 0.38) {
      type = 'OIL_SLICK';
      width = 45;
      height = 30;
      color = '#334155';
      speed = 0;
    } else {
      // Traffic Vehicles
      const vehicleChoice = Math.random();
      if (vehicleChoice < 0.4) {
        type = 'SEDAN';
        color = colors[Math.floor(Math.random() * colors.length)];
        speed = 45 + Math.random() * 20;
      } else if (vehicleChoice < 0.75) {
        type = 'SPORTS';
        color = '#dc2626'; // Red racers
        speed = 70 + Math.random() * 30;
        width = 44;
        height = 78;
      } else if (vehicleChoice < 0.9) {
        type = 'TRUCK';
        color = '#ca8a04'; // yellow cab
        speed = 25 + Math.random() * 15;
        width = 54;
        height = 115;
      } else {
        type = 'POLICE';
        color = '#1e293b';
        speed = 95 + Math.random() * 25; // extremely fast chases!
      }
    }

    // Apply level difficulty speed multiplier for sliding traffic cars
    const currentDifficultyLvl = getLevelConfigByScore(scoreRef.current);
    if (speed > 0) {
      speed *= currentDifficultyLvl.obstacleSpeedMultiplier;
    }

    // Place obstacle safely at the top off-screen
    const spawnY = -120;
    const spawnX = laneCenters[lane];

    // Check if another obstacle is too close inside that chosen lane
    const tooClose = obstaclesRef.current.some(
      (obs) => obs.lane === lane && Math.abs(obs.y - spawnY) < 180
    );

    if (!tooClose) {
      obstaclesRef.current.push({
        id: Math.random().toString(),
        type,
        lane,
        x: spawnX,
        y: spawnY,
        width,
        height,
        speed,
        color,
        bounced: false,
        bounceX: 0,
        bounceY: 0,
        angle: 0,
      });
    }
  };

  // Spawners for road margins landscape decorators
  const spawnDecoration = () => {
    const side = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
    const sideMargin = 72;
    const scrollPos = -100;
    
    // Choose coordinate out of the central road asphalt
    const dX = side === 'LEFT' 
      ? Math.random() * (sideMargin - 15) 
      : LOGICAL_WIDTH - sideMargin + 15 + Math.random() * (sideMargin - 15);
      
    const colors = ['#16a34a', '#15803d', '#1e3a8a', '#3f2c20', '#475569'];
    const types: Array<'TREE' | 'BUSH' | 'ROCK' | 'STREET_LIGHT' | 'BILLBOARD'> = [
      'TREE', 'TREE', 'BUSH', 'STREET_LIGHT', 'ROCK'
    ];
    
    decorationsRef.current.push({
      id: Math.random().toString(),
      x: dX,
      y: scrollPos,
      type: types[Math.floor(Math.random() * types.length)],
      size: 20 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      parallaxSpeed: 0.85,
      side,
    });
  };

  // VECTOR CANVAS RENDER ENGINE (60FPS painting loop)
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset with extreme safety margin
    ctx.save();
    
    // Core dynamic screen shake offset implementation
    if (screenShakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * screenShakeRef.current;
      const dy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(dx, dy);
    }

    // DRAW GROUND / TERRAIN (Grass land on left and right)
    ctx.fillStyle = '#065f46'; // dark forest green shoulder grass background
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // DRAW SCENERY PARALLAX SHADING (Slightly lighter inner highway buffer)
    ctx.fillStyle = '#0f766e'; // Teal grassy highway shoulder
    ctx.fillRect(72, 0, LOGICAL_WIDTH - 144, LOGICAL_HEIGHT);

    // DRAW THE CENTRAL ASPHALT ROADWAY
    const roadWidth = 320;
    const roadX = (LOGICAL_WIDTH - roadWidth) / 2; // 90px centered
    
    ctx.fillStyle = '#1e293b'; // High-contrast matte dark charcoal asphalt
    ctx.fillRect(roadX, 0, roadWidth, LOGICAL_HEIGHT);

    // DRAW THE ROAD BORDERS (Curb alternating red/white rumble strips for high visual velocity)
    const curbW = 12;
    const repeatLengthHeight = 40;
    const phaseOffset = roadOffsetRef.current % repeatLengthHeight;

    for (let y = -repeatLengthHeight; y < LOGICAL_HEIGHT + repeatLengthHeight; y += repeatLengthHeight) {
      const finalY = y + phaseOffset;
      const activeColor = Math.floor((y + roadOffsetRef.current) / repeatLengthHeight) % 2 === 0 ? '#ef4444' : '#f8fafc';
      
      // Left rumble curb border
      ctx.fillStyle = activeColor;
      ctx.fillRect(roadX - curbW, finalY, curbW, repeatLengthHeight);
      
      // Right rumble curb border
      ctx.fillRect(roadX + roadWidth, finalY, curbW, repeatLengthHeight);
    }

    // DRAW THE WHITE ANIMATED LANE DIVIDERS (Dasheed lines separating the 3 lanes)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.setLineDash([25, 30]);
    ctx.lineDashOffset = -roadOffsetRef.current;

    // Line 1: Border of left and center lane (Offset = roadX + laneGap = 90 + 106.6 = 196.6)
    ctx.beginPath();
    ctx.moveTo(roadX + 106.6, 0);
    ctx.lineTo(roadX + 106.6, LOGICAL_HEIGHT);
    ctx.stroke();

    // Line 2: Border of center and right lane (Offset = roadX + laneGap*2 = 90 + 213.3 = 303.3)
    ctx.beginPath();
    ctx.moveTo(roadX + 213.3, 0);
    ctx.lineTo(roadX + 213.3, LOGICAL_HEIGHT);
    ctx.stroke();

    // Reset dash pattern
    ctx.setLineDash([]);

    // DRAW SPECTACULAR NEON SPEED STREAM LINES IN NITRO BOOST
    const player = playerRef.current;
    if (player.nitroActive) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'; // Electric Cyan flow streaks
      for (let i = 0; i < 15; i++) {
        const streakX = roadX + Math.random() * roadWidth;
        const streakY = Math.random() * LOGICAL_HEIGHT;
        const streakH = 80 + Math.random() * 120;
        ctx.fillRect(streakX, streakY, 1.5, streakH);
      }
    }

    // DRAW ENVIRONMENT MOUNT SCENERY LANDSCAPE DECORATIONS (Parallax parallax trees, barriers)
    decorationsRef.current.forEach((d) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      
      if (d.type === 'TREE') {
        const size = d.size;
        // Trunk shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.7, size * 0.4, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Brown trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-size * 0.12, 0, size * 0.24, size * 0.8);

        // Layers of green foliage
        ctx.fillStyle = d.color;
        
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(-size * 0.15, -size * 0.35, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(size * 0.15, -size * 0.3, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

      } else if (d.type === 'BUSH') {
        const size = d.size;
        // Shadow base
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.4, size * 0.5, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Foliage blob
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(-size * 0.25, 0, size * 0.3, 0, Math.PI * 2);
        ctx.arc(0, -size * 0.1, size * 0.35, 0, Math.PI * 2);
        ctx.arc(size * 0.25, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

      } else if (d.type === 'ROCK') {
        const s = d.size;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, s * 0.3, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Polygonal textured gray rock
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.3);
        ctx.lineTo(-s * 0.4, -s * 0.22);
        ctx.lineTo(0, -s * 0.4);
        ctx.lineTo(s * 0.4, -s * 0.1);
        ctx.lineTo(s * 0.5, s * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Highlight facet
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.4);
        ctx.lineTo(s * 0.4, -s * 0.1);
        ctx.lineTo(s * 0.5, s * 0.3);
        ctx.lineTo(0, s * 0.3);
        ctx.closePath();
        ctx.fill();

      } else if (d.type === 'STREET_LIGHT') {
        // High contrast post and illuminated light cone
        ctx.fillStyle = '#475569';
        ctx.fillRect(-2, -50, 4, 100); // vertical post

        // Light head
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-8, -55, 16, 8);
        
        // Glow lamp yellow
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -50, 4, 0, Math.PI * 2);
        ctx.fill();

        // If evening lighting simulation: draw transparent yellow conic light beam down
        const gradient = ctx.createRadialGradient(0, -45, 0, 0, 50, 160);
        gradient.addColorStop(0, 'rgba(253, 224, 71, 0.3)');
        gradient.addColorStop(1, 'rgba(253, 224, 71, 0.0)');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(-5, -45);
        ctx.lineTo(-85, 300);
        ctx.lineTo(85, 300);
        ctx.lineTo(5, -45);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });

    // DRAW STATIC & DYNAMIC HIGHWAY TRAFFIC OBSTACLES (Sedans, sports cars, oil slicks, etc)
    obstaclesRef.current.forEach((obs) => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);

      // Shadow under cars
      if (obs.type !== 'OIL_SLICK') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.roundRect(-obs.width / 2 - 2, -obs.height / 2 + 5, obs.width + 4, obs.height, 8);
        ctx.fill();
      }

      if (obs.type === 'SEDAN') {
        const bodyColor = obs.color;
        const w = obs.width;
        const h = obs.height;

        // Tyres profile outline
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w / 2 - 2, -h / 2 + 8, 3, 14); // Front L
        ctx.fillRect(w / 2 - 1, -h / 2 + 8, 3, 14); // Front R
        ctx.fillRect(-w / 2 - 2, h / 2 - 22, 3, 14); // Rear L
        ctx.fillRect(w / 2 - 1, h / 2 - 22, 3, 14); // Rear R

        // Metal main body (Sleek rounded box design)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();

        // Dual hood stripes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-w * 0.25, -h * 0.38, w * 0.1, h * 0.3);
        ctx.fillRect(w * 0.15, -h * 0.38, w * 0.1, h * 0.3);

        // Windshield windshield glass reflection
        ctx.fillStyle = '#0f172a'; // glassy black
        ctx.beginPath();
        ctx.roundRect(-w * 0.38, -h * 0.1, w * 0.76, h * 0.2, 3);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // spec light shine
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.08);
        ctx.lineTo(w * 0.1, -h * 0.08);
        ctx.lineTo(w * 0.2, h * 0.05);
        ctx.lineTo(-w * 0.2, h * 0.05);
        ctx.closePath();
        ctx.fill();

        // Rear windshield window
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-w * 0.36, h * 0.2, w * 0.72, h * 0.12, 2);
        ctx.fill();

        // Red taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-w / 2 + 3, h / 2 - 2, 7, 2);
        ctx.fillRect(w / 2 - 10, h / 2 - 2, 7, 2);

        // Flashing brake indicator if passing player
        if (Math.sin(Date.now() / 150) > 0) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
        }

      } else if (obs.type === 'SPORTS') {
        const bodyColor = obs.color;
        const w = obs.width;
        const h = obs.height;

        // Tyres
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w / 2 - 3, -h / 2 + 10, 4, 15);
        ctx.fillRect(w / 2 - 1, -h / 2 + 10, 4, 15);
        ctx.fillRect(-w / 2 - 3, h / 2 - 24, 4, 15);
        ctx.fillRect(w / 2 - 1, h / 2 - 24, 4, 15);

        // Hyper-car aerodynamic angular body outline
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.5);
        ctx.lineTo(w * 0.3, -h * 0.5);
        ctx.lineTo(w / 2, -h * 0.35);
        ctx.lineTo(w / 2, h * 0.42);
        ctx.lineTo(w * 0.4, h * 0.5);
        ctx.lineTo(-w * 0.4, h * 0.5);
        ctx.lineTo(-w / 2, h * 0.42);
        ctx.lineTo(-w / 2, -h * 0.35);
        ctx.closePath();
        ctx.fill();

        // Large high aerodynamic Carbon Spoiler
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w / 2 - 4, h / 2 - 5, w + 8, 4); // main wing spoiler
        ctx.fillRect(-w / 2 + 4, h / 2 - 8, 3, 4); // wing mount L
        ctx.fillRect(w / 2 - 7, h / 2 - 8, 3, 4); // wing mount R

        // Roof and front scoop reflections
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.1, w * 0.32, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glass cabin glare
        ctx.fillStyle = '#38bdf8'; // glowing ice blue glass cabin visual!
        ctx.beginPath();
        ctx.roundRect(-w * 0.3, -h * 0.18, w * 0.6, h * 0.16, 4);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-w * 0.15, -h * 0.44, w * 0.3, h * 0.08); // custom racing engine intake cowl

      } else if (obs.type === 'TRUCK') {
        const w = obs.width;
        const h = obs.height;

        // Big dual tyres configuration
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w / 2 - 2, -h / 2 + 15, 3, 20);
        ctx.fillRect(w / 2 - 1, -h / 2 + 15, 3, 20);
        ctx.fillRect(-w / 2 - 2.5, h * 0.1, 3.5, 20);
        ctx.fillRect(w / 2 - 1, h * 0.1, 3.5, 20);
        ctx.fillRect(-w / 2 - 2.5, h / 2 - 30, 3.5, 20);
        ctx.fillRect(w / 2 - 1, h / 2 - 30, 3.5, 20);

        // Solid delivery truck flat rear container bed
        ctx.fillStyle = '#475569'; // cargo dark container grey
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.28, w * 0.96, h * 0.76, 4);
        ctx.fill();

        // Metal ribs on the back of the truck container cargo
        ctx.fillStyle = '#334155';
        for (let ribY = -h * 0.22; ribY < h * 0.45; ribY += 15) {
          ctx.fillRect(-w * 0.44, ribY, w * 0.88, 3);
        }

        // Lighter orange front cab
        ctx.fillStyle = obs.color; // yellow/orange
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.5, w * 0.9, h * 0.22, 5);
        ctx.fill();

        // Cab black windshield glass
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.38, -h * 0.46, w * 0.76, h * 0.08);

        // Emergency side mirrors
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w / 2 - 3, -h * 0.46, 3, 6);
        ctx.fillRect(w / 2, -h * 0.46, 3, 6);

      } else if (obs.type === 'POLICE') {
        const w = obs.width;
        const h = obs.height;

        // Black outline car body
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();

        // Star decoration insignias
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w / 2 + 1, -h * 0.15, 3, h * 0.3); // side doors white markings
        ctx.fillRect(w / 2 - 4, -h * 0.15, 3, h * 0.3);

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(-w * 0.35, -h * 0.2, w * 0.7, h * 0.4, 4);
        ctx.fill();

        // Police flashing emergency rooftop light bar
        const isAlternate = Math.floor(Date.now() / 90) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#3b82f6' : '#ef4444'; // Flashing blue and red
        ctx.fillRect(-w * 0.35, -h * 0.04, w * 0.35, h * 0.08);
        
        ctx.fillStyle = isAlternate ? '#ef4444' : '#3b82f6';
        ctx.fillRect(0, -h * 0.04, w * 0.35, h * 0.08);

        // Middle bright spacer
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-1.5, -h * 0.04, 3, h * 0.08);

        // Emit police lights background wash glow effect (Dynamic spotlight circle)
        const flashGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 100);
        flashGrad.addColorStop(0, isAlternate ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)');
        flashGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI * 2);
        ctx.fill();

      } else if (obs.type === 'OIL_SLICK') {
        const w = obs.width;
        const h = obs.height;
        
        // Liquid dark spill styling
        const pulseRatio = 1 + Math.sin(Date.now() / 250) * 0.05;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2 * pulseRatio, h / 2 * pulseRatio, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Dark oily metallic reflection gradient highlights
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)'; // purple sheen tint
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)'; // cyan sheen tint
        ctx.beginPath();
        ctx.ellipse(-w * 0.1, -h * 0.1, w * 0.25, h * 0.25, 0.2, 0, Math.PI * 2);
        ctx.stroke();

      } else if (obs.type === 'CONE') {
        const w = obs.width;
        const h = obs.height;

        // Square orange rubber footprint
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Glowing orange reflective cone ring
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff'; // White vinyl stripe
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.15, 0, Math.PI * 2);
        ctx.fill();

      } else if (obs.type === 'COIN') {
        // Rotates procedurally in a 3D-like spinning transformation
        const spinRatio = Math.abs(Math.sin(Date.now() / 150));
        const s = obs.width;
        
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;

        // Shiny golden ring
        ctx.fillStyle = '#d97706'; // darker gold outline shadow
        ctx.beginPath();
        ctx.ellipse(0, 0, s / 2 * spinRatio + 1.5, s / 2 + 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15'; // main gold body
        ctx.beginPath();
        ctx.ellipse(0, 0, s / 2 * spinRatio, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle core symbol 'C'
        ctx.fillStyle = '#fef08a';
        ctx.font = `bold ${s * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);

      } else if (obs.type === 'BOOST') {
        const size = obs.width;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;

        // Green chevron capsule styling
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Shiny silver border
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Tech tool Chevron symbol inside
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(-size * 0.22, size * 0.18);
        ctx.lineTo(0, -size * 0.25);
        ctx.lineTo(size * 0.22, size * 0.18);
        ctx.lineTo(size * 0.22, size * 0.05);
        ctx.lineTo(0, -size * 0.38);
        ctx.lineTo(-size * 0.22, size * 0.05);
        ctx.closePath();
        ctx.fill();
        
        // Flashing lightning center
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.15);
        ctx.lineTo(size * 0.1, -size * 0.02);
        ctx.lineTo(-size * 0.05, 0);
        ctx.lineTo(-size * 0.08, size * 0.14);
        ctx.lineTo(-size * 0.12, -size * 0.02);
        ctx.lineTo(size * 0.02, -size * 0.02);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });

    // DRAW PARTICLES SMOOTHLY OVER ROADWAY
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      
      ctx.beginPath();
      if (p.type === 'SMOKE') {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      } else if (p.type === 'SPARK') {
        // diamond sharp sparks
        ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.fill();
      ctx.restore();
    });

    // DRAW THE HERO / PLAYER CAR IN FRONT (Always styled with chosen vibrant color + details)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Flashing visibility rendering during invincibility states
    let isVisible = true;
    if (player.invincibleTime > 0) {
      isVisible = Math.floor(Date.now() / 85) % 2 === 0;
    }

    if (isVisible) {
      const plW = player.width;
      const plH = player.height;

      // Tyre tread profiles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-plW / 2 - 3, -plH / 2 + 10, 4, 15); // front L tyre
      ctx.fillRect(plW / 2 - 1, -plH / 2 + 10, 4, 15); // front R tyre
      ctx.fillRect(-plW / 2 - 3, plH / 2 - 25, 4, 15); // rear L tyre
      ctx.fillRect(plW / 2 - 1, plH / 2 - 25, 4, 15); // rear R tyre

      // Underglow cyan safety line (Only if active or nitro is boosting!)
      if (player.nitroActive) {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.fillRect(-plW / 2 + 2, -plH / 3, plW - 4, plH * 0.6);
        ctx.shadowBlur = 0; // reset
      }

      // Elegant curves main vector body shell of the sports supercar
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.moveTo(-plW * 0.35, -plH * 0.5); // apex nose tip
      ctx.lineTo(plW * 0.35, -plH * 0.5);
      ctx.quadraticCurveTo(plW / 2, -plH * 0.3, plW / 2, -plH * 0.1); // side wing flares
      ctx.lineTo(plW / 2, plH * 0.38);
      ctx.quadraticCurveTo(plW / 2 + 2, plH * 0.45, plW * 0.38, plH * 0.5); // rear bumper curves
      ctx.lineTo(-plW * 0.38, plH * 0.5);
      ctx.quadraticCurveTo(-plW / 2 - 2, plH * 0.45, -plW / 2, plH * 0.38);
      ctx.lineTo(-plW / 2, -plH * 0.1);
      ctx.quadraticCurveTo(-plW / 2, -plH * 0.3, -plW * 0.35, -plH * 0.5);
      ctx.closePath();
      ctx.fill();

      // Cyber racing stripes along center hood
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(-6, -plH * 0.44, 4, plH * 0.32);
      ctx.fillRect(2, -plH * 0.44, 4, plH * 0.32);

      // Cabin roof structure lines
      ctx.fillStyle = '#0f172a'; // black roof
      ctx.beginPath();
      ctx.roundRect(-plW * 0.38, -plH * 0.22, plW * 0.76, plH * 0.42, 6);
      ctx.fill();

      // Windshield glossy reflection wrap
      ctx.fillStyle = '#0284c7'; // Ice glass neon blue
      ctx.beginPath();
      ctx.moveTo(-plW * 0.32, -plH * 0.16);
      ctx.lineTo(plW * 0.32, -plH * 0.16);
      ctx.lineTo(plW * 0.24, -plH * 0.04);
      ctx.lineTo(-plW * 0.24, -plH * 0.04);
      ctx.closePath();
      ctx.fill();
      
      // Windshield white bright glare sweep
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-plW * 0.2, -plH * 0.15);
      ctx.lineTo(plW * 0.1, -plH * 0.15);
      ctx.lineTo(plW * 0.02, -plH * 0.06);
      ctx.lineTo(-plW * 0.12, -plH * 0.06);
      ctx.closePath();
      ctx.fill();

      // Rear window cockpit glass
      ctx.fillStyle = '#075985';
      ctx.beginPath();
      ctx.roundRect(-plW * 0.3, plH * 0.08, plW * 0.6, plH * 0.1, 2);
      ctx.fill();

      // Yellow Headlights projecting forward cones (Creates immersive racing visuals)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-plW * 0.35 + 1, -plH * 0.5, 5, 2);
      ctx.fillRect(plW * 0.35 - 6, -plH * 0.5, 5, 2);

      // Headlight spotlights illuminating road asphalt
      const lightGrad = ctx.createRadialGradient(0, -plH * 0.5, 5, 0, -plH * 0.5 - 200, 180);
      lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
      
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(-plW * 0.35, -plH * 0.5);
      ctx.lineTo(-plW * 1.5, -plH * 0.5 - 250);
      ctx.lineTo(plW * 1.5, -plH * 0.5 - 250);
      ctx.lineTo(plW * 0.35, -plH * 0.5);
      ctx.closePath();
      ctx.fill();

      // Dual crimson taillights at the back exhaust line
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-plW * 0.38, plH * 0.5 - 2, 8, 2.5);
      ctx.fillRect(plW * 0.38 - 8, plH * 0.5 - 2, 8, 2.5);
      
      // Cyber twin alloy chrome exhausts
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-11, plH * 0.5, 3, 4);
      ctx.fillRect(8, plH * 0.5, 3, 4);
    }

    ctx.restore(); // Restores after player offsets

    // DRAW DYNAMIC FLOATING TEXT HOVER POPUPS (+Coins, combo multiples)
    floatTextsRef.current.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${Math.floor(20 * ft.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  };

  // Setup the RAF rendering loop and cleanup correctly
  useEffect(() => {
    let lastTime = performance.now();
    
    const loop = (time: number) => {
      const elapsed = time - lastTime;
      lastTime = time;
      if (gameState === 'PLAYING') {
        const deltaSec = Math.min(0.04, elapsed / 1000); // capped delta for safety
        updateGame(deltaSec);
        render();
      }
      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    if (canvasRef.current) {
      // Paint first template graphics on landing / menu status
      render();
    }

    if (gameState === 'PLAYING') {
      lastTime = performance.now(); // synchronize right dynamically before registering
      animationFrameIdRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState]);

  // Synchronize start/restart of game loop on state shift
  useEffect(() => {
    if (gameState === 'PLAYING') {
      startGame();
    }
  }, [gameState, startGame]);

  // Clean engine sounds when state unmounts or transitions
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      audio.stopEngine();
    }
  }, [gameState]);

  return (
    <div 
      className="relative flex flex-col items-center justify-center w-full h-full max-w-lg mx-auto"
      ref={containerRef}
      id="game-panel-container"
    >
      {/* Sound Controller overlay floating button */}
      <button
        onClick={handleToggleMute}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-900/80 border border-slate-700/50 backdrop-blur-md text-slate-100 hover:bg-slate-800 transition cursor-pointer shadow-lg shadow-black/10 hover:scale-105"
        id="btn-sound-toggle"
        title={isMuted ? "Unmute Game Sounds" : "Mute Sounds"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
      </button>

      {/* RENDER CANVAS CONTAINER WITH EXACT ASPECT RATIO PRESERVATION */}
      <div 
        className="relative overflow-hidden w-full aspect-[5/8] rounded-2xl bg-slate-950 shadow-2xl border-2 border-slate-800 shadow-black/60 shrink-0"
        id="canvas-scaler-wrapper"
      >
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          className="w-full h-full block object-contain select-none"
          id="retro-racer-canvas"
        />

        {/* ON-SCREEN OVERLAY TAP CONTROLS FOR RESPONSIVE MOBILE USABILITY */}
        {gameState === 'PLAYING' && (
          <div className="absolute inset-0 z-10 flex flex-col justify-end pointer-events-none pb-4 px-4 select-none" id="touch-controls-container">
            
            {/* Visual alert if low health warning flashing */}
            {playerRef.current.health <= 30 && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded bg-red-600/90 border border-red-500 text-white font-semibold text-xs flex items-center gap-1.5 animate-pulse shadow-md select-none" id="low-hp-alert">
                <AlertTriangle className="w-3.5 h-3.5 fill-white text-red-600" />
                LOW VEHICLE INTEGRITY
              </div>
            )}

            {/* Tap triggers layer (transparent zones) */}
            <div className="w-full h-2/3 flex items-stretch pointer-events-auto select-none" id="tap-zones-layer">
              <button 
                onMouseDown={() => steerTo(playerRef.current.lane - 1)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  steerTo(playerRef.current.lane - 1);
                }}
                className="flex-1 opacity-0 outline-none select-none cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                id="touch-left-trigger"
                title="Steer Left"
              />
              <button 
                onMouseDown={() => steerTo(playerRef.current.lane + 1)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  steerTo(playerRef.current.lane + 1);
                }}
                className="flex-1 opacity-0 outline-none select-none cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                id="touch-right-trigger"
                title="Steer Right"
              />
            </div>

            {/* Interactive Mobile Control Buttons Floating Rack */}
            <div className="w-full flex justify-between items-center gap-10 px-4 mt-2 h-16 pointer-events-auto select-none md:hidden" id="mobile-control-rack">
              {/* Left Steer Assist */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  steerTo(playerRef.current.lane - 1);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 active:bg-slate-800 text-white active:scale-95 transition-all select-none shadow-md shadow-black/40 outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                id="btn-steer-left-assist"
              >
                <span className="text-2xl font-bold font-mono">←</span>
              </button>

              {/* Central Boost Activator */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  keysPressedRef.current['ArrowUp'] = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  keysPressedRef.current['ArrowUp'] = false;
                }}
                className="flex-1 h-16 flex items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-500/50 active:brightness-125 text-white font-semibold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-950/40 select-none outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                id="btn-boost-tap"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-bounce" />
                NITRO BOOST
              </button>

              {/* Right Steer Assist */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  steerTo(playerRef.current.lane + 1);
                }}
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 active:bg-slate-800 text-white active:scale-95 transition-all select-none shadow-md shadow-black/40 outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                id="btn-steer-right-assist"
              >
                <span className="text-2xl font-bold font-mono">→</span>
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center font-mono select-none hidden md:block" id="desktop-control-help-hint">
              Tap screen or press <span className="text-white">A / D / ←/→</span> to steer • hold <span className="text-white">W / Space / ↑</span> to nitro boost
            </p>
          </div>
        )}

        {/* OVERLAPPING MAIN MENU POPUP UI */}
        {gameState === 'MENU' && (
          <div 
            className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-center items-center p-8 select-none"
            id="layout-landing-overlay-card"
          >
            <div className="absolute top-10 flex flex-col items-center fill-emerald-500 gap-1.5" id="game-brand-sign">
              <span className="px-2.5 py-1 rounded bg-rose-600 text-xs font-bold uppercase tracking-widest text-slate-100 animate-pulse">
                ARCADE TURBO
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-stone-50 to-slate-400 filter drop-shadow-md text-center mt-2 font-sans" id="brand-h1">
                RADIAL FUEL
              </h1>
              <p className="text-xs text-slate-400 font-mono text-center max-w-xs mt-1" id="brand-p">
                High fidelity 2D highway overtake racer
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 mt-20 w-full" id="landing-main-hub">
              <button
                onClick={startGame}
                className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold text-center flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-98 cursor-pointer shadow-xl shadow-teal-950/40 transition duration-200 outline-none border border-teal-300/30 group"
                id="btn-play-game-overlord"
              >
                <Play className="w-5 h-5 fill-slate-950 text-slate-950 group-hover:scale-110 transition duration-200" />
                <span className="tracking-tight text-lg">START RACE</span>
              </button>

              <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-slate-800 bg-slate-900/60 max-w-sm w-full select-none" id="help-rulebook-rack">
                <span className="text-xs font-bold text-teal-400 tracking-wider font-mono self-start uppercase">HOW TO PLAY</span>
                <div className="text-xs text-slate-300 font-mono leading-relaxed space-y-1.5 pl-0.5" id="help-bullet-lists">
                  <p>🏎️ Steer: <span className="text-slate-100 font-bold">Left/Right Arrow</span> or <span className="text-slate-100 font-bold">A/D Keys</span> (Tap screen left/right side on mobile)</p>
                  <p>⚡ Nitro: Hold <span className="text-slate-100 font-bold">Up Arrow / W / Space</span> for extreme speed</p>
                  <p>⚠️ Dodge traffic and road obstacles! Each crash degrades vehicle integrity.</p>
                  <p>🌟 Overtake vehicles closely with combo streaks for massive scores!</p>
                  <p>💰 Pick up <span className="text-amber-400 font-bold">Gold Coins</span> and <span className="text-emerald-400 font-bold">Repair Kits</span> along the road.</p>
                </div>
              </div>
            </div>

            <p className="absolute bottom-6 text-[10px] text-slate-500 font-mono tracking-wider select-none text-center" id="built-copyright">
              60 FPS RENDER • ACCELEROMETER NOT IMPLEMENTED
            </p>
          </div>
        )}

        {/* CENTERED GAME OVER OVERLAY POPUP */}
        {gameState === 'GAMEOVER' && (
          <div 
            className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-center items-center p-6 select-none animate-fadeIn"
            id="layout-gameover-overlay-card"
          >
            <div className="absolute top-10 flex flex-col items-center gap-1" id="gameover-brand-sign">
              <span className="px-3 py-1 rounded bg-rose-600 font-extrabold text-[10px] uppercase tracking-widest text-slate-100 animate-pulse font-mono shadow-md shadow-rose-600/30">
                ⚠️ VEHICLE CRASHED
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans mt-2" id="canvas-gameover-brand-title">
                GAME OVER
              </h2>
            </div>

            <div className="flex flex-col items-center gap-5 mt-16 w-full" id="gameover-main-hub">
              
              {/* Main Score Readout badge in the center */}
              <div className="flex flex-col items-center gap-1 p-5 rounded-2xl border border-slate-800 bg-slate-900/80 w-full max-w-xs text-center shadow-lg shadow-black/45" id="canvas-gameover-metrics-panel">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">FINAL SCORE</span>
                <span className="text-3xl font-black font-mono text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.25)]" id="canvas-final-score-val">
                  {Math.floor(scoreRef.current).toLocaleString()}
                </span>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-850 text-[10px] font-mono text-slate-400" id="canvas-final-substats">
                  <span>Dist: <strong className="text-slate-200">{distanceRef.current.toFixed(0)}m</strong></span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span>Coins: <strong className="text-yellow-400">{coinsCountRef.current}</strong></span>
                </div>
              </div>

              {/* Massive action restart button in the center */}
              <div className="flex flex-col gap-3.5 w-full max-w-xs" id="canvas-gameover-actions-rack">
                <button
                  onClick={startGame}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-center flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-95 cursor-pointer shadow-xl shadow-teal-500/25 transition duration-150 outline-none border border-teal-300/40 group font-mono"
                  id="btn-centered-canvas-restart"
                >
                  <RotateCcw className="w-5 h-5 text-slate-950 group-hover:rotate-180 transition duration-500" />
                  <span className="tracking-tight text-lg uppercase">RESTART</span>
                </button>

                <button
                  onClick={() => setGameStateRef.current('MENU')}
                  className="w-full py-3 px-6 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-slate-300 font-semibold text-center flex items-center justify-center gap-2 active:scale-98 cursor-pointer transition outline-none border border-slate-800"
                  id="btn-centered-canvas-menu"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  <span className="text-xs uppercase font-mono tracking-wider">MAIN MENU</span>
                </button>
              </div>
            </div>

            <p className="absolute bottom-6 text-[10px] text-slate-500 font-mono tracking-wider select-none text-center" id="gameover-built-copyright">
              PRESS SPACEBAR OR ENTER TO RESTART
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
