/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Zap, Award, Gauge, Star } from 'lucide-react';
import { getLevelConfigByScore, getNextLevelConfigByScore } from '../types';

interface HUDProps {
  score: number;
  speed: number;
  distance: number;
  health: number;
  nitro: number;
}

export default function HUD({ score, speed, distance, health, nitro }: HUDProps) {
  const currentLevel = getLevelConfigByScore(score);
  const nextLevel = getNextLevelConfigByScore(score);

  // calculate level percentage progress
  let progressPct = 100;
  if (nextLevel) {
    const range = nextLevel.scoreRequired - currentLevel.scoreRequired;
    const currentProgress = score - currentLevel.scoreRequired;
    progressPct = Math.min(100, Math.max(0, (currentProgress / range) * 100));
  }

  // Pad score with leading zeros like retro games
  const formatScore = (num: number) => {
    return String(num).padStart(6, '0');
  };

  // Health color mapping
  const getHealthColor = (hp: number) => {
    if (hp > 60) return 'bg-emerald-500 shadow-emerald-500/40';
    if (hp > 25) return 'bg-amber-500 shadow-amber-500/40';
    return 'bg-red-500 animate-pulse shadow-red-500/50';
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4 rounded-2xl glass-panel select-none" id="hud-top-dashboard">
      
      {/* Top Main Score and High Score Tracker */}
      <div className="flex justify-between items-center" id="hud-score-row">
        <div className="flex flex-col" id="hud-score-col">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">CURRENT SCORE</span>
          <span className="text-3xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-400 to-emerald-200" id="hud-score-val">
            {formatScore(score)}
          </span>
        </div>

        <div className="flex flex-col items-end animate-pulse" id="hud-speedometer-col">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">VELOCITY</span>
          <div className="flex items-baseline gap-0.5" id="hud-speed-gauge-wrap">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-100" id="hud-speed-val">
              {speed}
            </span>
            <span className="text-xs text-emerald-400 font-bold font-mono">KM/H</span>
          </div>
        </div>
      </div>

      {/* Dynamic Difficulty Level Status Area */}
      <div className="flex flex-col gap-2 px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-900" id="hud-difficulty-bar">
        <div className="flex justify-between items-center text-[10px] font-mono tracking-wider" id="hud-diff-meta">
          <span className="flex items-center gap-1.5 text-slate-400 font-bold">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 animate-pulse" />
            DIFFICULTY LEVEL:
          </span>
          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] text-white bg-gradient-to-r shadow-sm ${currentLevel.color}`}>
            LVL {currentLevel.level} — {currentLevel.name.toUpperCase()}
          </span>
        </div>
        
        {nextLevel ? (
          <div className="flex items-center gap-2" id="hud-diff-progress-row">
            <div className="h-1.5 flex-1 bg-slate-900 rounded-full overflow-hidden p-px">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500 transition-all duration-300 shadow-teal-500/30 shadow-md"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-500 font-mono">
              NEXT: {nextLevel.scoreRequired} PTS
            </span>
          </div>
        ) : (
          <div className="text-[10px] font-black font-mono text-amber-400 animate-pulse text-center tracking-normal">
            ⚡ MAX DIFFICULTY LEVEL ACTIVE (GODLIKE SPEED) ⚡
          </div>
        )}
      </div>

      {/* METERS BAR INTEGRITY AND NITRO TURBO CHARGERS */}
      <div className="grid grid-cols-2 gap-4" id="hud-stats-grid">
        
        {/* Vehicle Integrity Health */}
        <div className="flex flex-col gap-1.5" id="hud-integrity-section">
          <div className="flex justify-between items-center font-mono text-[10px] text-slate-400 font-bold" id="hud-hp-header">
            <span className="flex items-center gap-1">
              <Heart className={`w-3.5 h-3.5 fill-red-500/80 ${health <= 30 ? 'animate-bounce text-red-500' : 'text-slate-400'}`} />
              INTEGRITY
            </span>
            <span className={health <= 30 ? 'text-red-400 font-black animate-pulse' : 'text-slate-200'}>{health}%</span>
          </div>
          <div className="h-3.5 w-full bg-slate-950 rounded-full p-0.5 overflow-hidden border border-slate-805" id="hud-hp-track">
            {/* Smooth transition bar width */}
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getHealthColor(health)}`}
              style={{ width: `${health}%` }}
              id="hud-hp-fill"
            />
          </div>
        </div>

        {/* Nitro Thruster Boost Capacity */}
        <div className="flex flex-col gap-1.5" id="hud-nitro-section">
          <div className="flex justify-between items-center font-mono text-[10px] text-slate-400 font-bold" id="hud-nitro-header">
            <span className="flex items-center gap-1 text-slate-400">
              <Zap className={`w-3.5 h-3.5 fill-amber-500/80 ${nitro > 90 ? 'animate-bounce text-amber-400' : 'text-slate-400'}`} />
              THRUSTER NITRO
            </span>
            <span className="text-slate-200">{nitro}%</span>
          </div>
          <div className="h-3.5 w-full bg-slate-950 rounded-full p-0.5 overflow-hidden border border-slate-805" id="hud-nitro-track">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 rounded-full transition-all duration-150 shadow-sm shadow-amber-500/30"
              style={{ width: `${nitro}%` }}
              id="hud-nitro-fill"
            />
          </div>
        </div>

      </div>

      {/* Dynamic Odometer Track miles */}
      <div className="flex justify-between items-center border-t border-slate-800/50 pt-2 font-mono text-xs text-slate-400" id="hud-odometer-footer">
        <span className="flex items-center gap-1" id="hud-milestone">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          ODOMETER
        </span>
        <span className="font-bold text-slate-200" id="hud-odometer-val">
          {distance.toLocaleString()} m
        </span>
      </div>

    </div>
  );
}
