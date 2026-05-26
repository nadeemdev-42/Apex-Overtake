/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScoreData, getLevelConfigByScore } from '../types';
import { RotateCcw, Home, Award, Calendar, Trophy, Trash2, Star } from 'lucide-react';

interface GameOverProps {
  score: number;
  stats: ScoreData;
  onRestart: () => void;
  onGoToMenu: () => void;
  onLeaderboardChange?: () => void;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  distance: number;
  cars: number;
  coins: number;
  date: string;
}

export default function GameOver({ score, stats, onRestart, onGoToMenu, onLeaderboardChange }: GameOverProps) {
  const [driverInitials, setDriverInitials] = useState('');
  const [copiedLeaderboard, setCopiedLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);

  // Load existing local scores on mount
  useEffect(() => {
    const rawScores = localStorage.getItem('retro_racer_leaderboard');
    let list: LeaderboardEntry[] = [];
    if (rawScores) {
      try {
        list = JSON.parse(rawScores);
      } catch (e) {
        list = [];
      }
    }

    // Sort descending
    list.sort((a, b) => b.score - a.score);
    setCopiedLeaderboard(list);

    // Evaluate if current score represents a new high score
    if (list.length === 0 || score > list[0].score) {
      setIsNewHigh(true);
    }
  }, [score]);

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverInitials.trim() || hasSaved) return;

    const name = driverInitials.toUpperCase().slice(0, 3);
    const newEntry: LeaderboardEntry = {
      name,
      score,
      distance: stats.totalDistance,
      cars: stats.carsOvertaken,
      coins: stats.coinsCount,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updatedList = [...copiedLeaderboard, newEntry];
    updatedList.sort((a, b) => b.score - a.score);
    // Persist Top 6 records only for view compactness
    const top6 = updatedList.slice(0, 6);

    localStorage.setItem('retro_racer_leaderboard', JSON.stringify(top6));
    setCopiedLeaderboard(top6);
    setHasSaved(true);
    setIsNewHigh(false);
    onLeaderboardChange?.();
  };

  const handleClearScores = () => {
    if (window.confirm('Are you sure you want to clear your local high scores?')) {
      localStorage.removeItem('retro_racer_leaderboard');
      setCopiedLeaderboard([]);
      setIsNewHigh(true);
      onLeaderboardChange?.();
    }
  };

  // Driver titles based on final scores
  const getDriverCommentary = (pts: number) => {
    if (pts > 25000) return { rank: 'Legendary Top Speed Ace', tagline: 'Unbeatable! You completely mastered the traffic highway lanes like a seasoned pro racer.' };
    if (pts > 12000) return { rank: 'Pro Highway Drifter', tagline: 'Impressive maneuvers! Your lane weaving and overtaking reflex time is pristine.' };
    if (pts > 5000) return { rank: 'Amateur Commuter', tagline: 'Good effort! Focus on collecting gold coins and timing your Nitro thruster bursts carefully.' };
    return { rank: 'Novice Driver', tagline: 'Keep practicing! Focus on dodging commuter sedans and wider trucks to sustain high speed integrity.' };
  };

  const appraisal = getDriverCommentary(score);
  const achievedLevel = getLevelConfigByScore(score);

  return (
    <div className="w-full flex flex-col gap-5 p-5 md:p-6 rounded-2xl glass-panel select-none text-slate-100" id="game-over-screen-card">
      
      {/* Title Header with flash */}
      <div className="text-center" id="gameover-main-headlines">
        {isNewHigh ? (
          <div className="inline-flex flex-col items-center gap-1 shrink-0 mb-1" id="new-record-alert-pill">
            <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest animate-bounce font-mono shadow-md shadow-amber-500/20">
              🏆 NEW PERSONAL BEST SCORE
            </span>
          </div>
        ) : (
          <span className="text-[11px] tracking-widest font-bold text-rose-500 uppercase font-mono">
            RACE OVER
          </span>
        )}
        <h2 className="text-4xl font-extrabold tracking-tight mt-1" id="headline-h2">
          CRASH COMPLETED
        </h2>
      </div>

      {/* Primary stats visual scorecard */}
      <div className="grid grid-cols-2 gap-4" id="stats-summary-grid">
        <div className="flex flex-col p-3 rounded-xl bg-slate-950/50 border border-slate-850" id="stat-score-panel">
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">TOTAL POINTS</span>
          <span className="text-2xl font-black font-mono text-emerald-400" id="score-val-hero">
            {score.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col p-3 rounded-xl bg-slate-950/50 border border-slate-850" id="stat-distance-panel">
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">DISTANCE TRAVELED</span>
          <span className="text-2xl font-black font-mono text-slate-100" id="distance-val-hero">
            {stats.totalDistance.toFixed(1)} m
          </span>
        </div>
        <div className="flex flex-col p-3 rounded-xl bg-slate-950/50 border border-slate-850" id="stat-overtake-panel">
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">VEHICLES OVERTAKEN</span>
          <span className="text-xl font-black font-mono text-cyan-400" id="cars-val-hero">
            {stats.carsOvertaken} cars
          </span>
        </div>
        <div className="flex flex-col p-3 rounded-xl bg-slate-950/50 border border-slate-850" id="stat-coins-panel">
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">GOLD COINS</span>
          <span className="text-xl font-black font-mono text-yellow-400" id="coins-val-hero">
            {stats.coinsCount} coins
          </span>
        </div>
        
        {/* Highest Difficulty Achieved Row */}
        <div className="col-span-2 flex justify-between items-center p-3 rounded-xl bg-slate-950/70 border border-slate-850" id="stat-level-panel">
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-slate-400 font-mono tracking-widest uppercase flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 animate-pulse" />
              PEAK DIFFICULTY LEVEL
            </span>
            <span className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-300 uppercase tracking-tight mt-0.5" id="level-name-hero">
              {achievedLevel.name}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg font-black text-xs text-white bg-gradient-to-r shadow-md shadow-slate-950/40 ${achievedLevel.color}`}>
            LVL {achievedLevel.level}
          </span>
        </div>
      </div>

      {/* Driver analysis appraisal appraisal */}
      <div className="p-3.5 rounded-xl border border-teal-900 bg-teal-950/30 font-sans" id="driver-appraisal-info">
        <div className="flex items-center gap-1.5 font-bold text-teal-400 font-mono text-xs" id="appraisal-row">
          <Award className="w-4 h-4 text-teal-400 animate-pulse" />
          SYSTEM ANALYSIS: {appraisal.rank}
        </div>
        <p className="text-xs text-teal-200/90 leading-relaxed mt-1" id="appraisal-desc">
          {appraisal.tagline}
        </p>
      </div>

      {/* Save Score Input form sheet */}
      {!hasSaved ? (
        <form onSubmit={handleSaveScore} className="flex flex-col gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/30" id="save-initials-form">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">ENTER IDENTITY FOR RECORD LOG</span>
          <div className="flex gap-2" id="initials-input-row">
            <input
              type="text"
              required
              maxLength={3}
              placeholder="AAA"
              value={driverInitials}
              onChange={(e) => setDriverInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
              className="flex-1 py-2 px-3 text-sm rounded bg-slate-950 border border-slate-800 font-bold font-mono uppercase tracking-wider text-center focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder-slate-700"
              id="initials-text-input"
            />
            <button
              type="submit"
              disabled={!driverInitials.trim()}
              className="py-2 px-4 rounded bg-teal-500 text-slate-950 font-bold text-xs hover:brightness-115 active:scale-95 transition-all text-center cursor-pointer outline-none disabled:opacity-50"
              id="btn-submit-score"
            >
              SAVE RUN
            </button>
          </div>
        </form>
      ) : (
        <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs font-mono text-emerald-400 font-bold animate-pulse" id="saved-badge">
          ✅ FLIGHT STATUS SAVED TO SCOREBOARD
        </div>
      )}

      {/* LEADERBOARD VIEW SCORING PANEL */}
      <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-4" id="scoreboard-leaderboard-box">
        <div className="flex justify-between items-center" id="board-header-row">
          <span className="text-xs font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1" id="board-title">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            TOP HIGH scoreS
          </span>
          {copiedLeaderboard.length > 0 && (
            <button 
              onClick={handleClearScores}
              className="text-slate-500 hover:text-red-400 transition flex items-center gap-0.5 text-[9px] font-mono cursor-pointer"
              id="btn-clear-scores"
            >
              <Trash2 className="w-3 h-3" />
              CLEAR LOG
            </button>
          )}
        </div>

        {copiedLeaderboard.length === 0 ? (
          <p className="text-center text-xs text-slate-500 font-mono py-2" id="empty-leaderboard-msg">
            No entries logged yet. Save your initials above!
          </p>
        ) : (
          <div className="flex flex-col gap-1.5" id="leaderboard-item-list">
            {copiedLeaderboard.map((item, idx) => (
              <div 
                key={idx}
                className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg font-mono text-xs ${idx === 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-slate-950/20 border border-transparent text-slate-300'}`}
                id={`leaderboard-item-${idx}`}
              >
                <div className="flex items-center gap-2" id={`leaderboard-item-meta-${idx}`}>
                  <span className="font-bold text-slate-500 w-4">{idx + 1}.</span>
                  <span className="font-black text-slate-100 uppercase tracking-widest">{item.name}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{item.date}</span>
                </div>
                <div className="flex gap-4 font-bold" id={`leaderboard-item-digits-${idx}`}>
                  <span className="text-slate-500">{item.distance.toFixed(0)}m</span>
                  <span className="text-emerald-400">{item.score.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions buttons footer control */}
      <div className="flex gap-4 border-t border-slate-800/80 pt-4" id="gameover-actions-menu">
        <button
          onClick={onGoToMenu}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer outline-none border border-slate-700/50"
          id="btn-main-menu-back"
        >
          <Home className="w-4 h-4 text-slate-300" />
          MENU
        </button>

        <button
          onClick={onRestart}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer outline-none border border-teal-400/20 shadow-lg shadow-teal-950/25"
          id="btn-restart-action"
        >
          <RotateCcw className="w-4 h-4 text-slate-950" />
          AGAIN
        </button>
      </div>

    </div>
  );
}
