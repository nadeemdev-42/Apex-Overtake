/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED';

export interface PlayerCar {
  x: number;
  y: number;
  targetX: number;
  lane: number;
  width: number;
  height: number;
  color: string;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  accel: number;
  nitroActive: boolean;
  nitroGauge: number; // 0 to 100
  steerProgress: number; // For smooth turning animation
  angle: number; // Dynamic rotation angle in radians for drifting/turning visual
  health: number; // 0 to 100
  invincibleTime: number; // Invincibility frames/time after getting hit
  skidTime: number; // Visual drift skidding
}

export type ObstacleType = 'SEDAN' | 'SPORTS' | 'TRUCK' | 'POLICE' | 'OIL_SLICK' | 'CONE' | 'COIN' | 'BOOST';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  bounced: boolean; // Did it collide and bounce away?
  bounceX: number;
  bounceY: number;
  angle: number;
  pulse?: number; // for animations
}

export interface Decoration {
  id: string;
  x: number;
  y: number;
  type: 'TREE' | 'BUSH' | 'ROCK' | 'STREET_LIGHT' | 'BILLBOARD';
  size: number;
  color: string;
  parallaxSpeed: number;
  side: 'LEFT' | 'RIGHT';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'SMOKE' | 'SPARK' | 'STAR' | 'SPEED_LINE';
}

export interface FloatText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
}

export interface ScoreData {
  highScore: number;
  totalDistance: number;
  carsOvertaken: number;
  coinsCount: number;
}

export interface LevelConfig {
  level: number;
  name: string;
  scoreRequired: number;
  speedMultiplier: number;
  spawnDelayMultiplier: number;
  obstacleSpeedMultiplier: number;
  color: string;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, name: "Amateur", scoreRequired: 0, speedMultiplier: 1.0, spawnDelayMultiplier: 1.3, obstacleSpeedMultiplier: 1.0, color: "from-indigo-500 to-blue-600" },
  { level: 2, name: "Street Racer", scoreRequired: 1500, speedMultiplier: 1.15, spawnDelayMultiplier: 1.05, obstacleSpeedMultiplier: 1.1, color: "from-emerald-500 to-teal-600" },
  { level: 3, name: "Highway Ace", scoreRequired: 4000, speedMultiplier: 1.32, spawnDelayMultiplier: 0.85, obstacleSpeedMultiplier: 1.25, color: "from-amber-500 to-orange-600" },
  { level: 4, name: "Speed Demon", scoreRequired: 7500, speedMultiplier: 1.48, spawnDelayMultiplier: 0.72, obstacleSpeedMultiplier: 1.4, color: "from-rose-500 to-red-600 animate-pulse" },
  { level: 5, name: "Apex Legend", scoreRequired: 12000, speedMultiplier: 1.65, spawnDelayMultiplier: 0.58, obstacleSpeedMultiplier: 1.6, color: "from-fuchsia-500 to-purple-600 animate-pulse" }
];

export const getLevelConfigByScore = (score: number): LevelConfig => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].scoreRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

export const getNextLevelConfigByScore = (score: number): LevelConfig | null => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (score < LEVELS[i].scoreRequired) {
      return LEVELS[i];
    }
  }
  return null;
};

