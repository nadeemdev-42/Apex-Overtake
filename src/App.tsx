/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import GameOver from './components/GameOver';
import { GameState, ScoreData } from './types';
import { Car, Trophy, Landmark, Flame, Compass, Palette, Award, HelpCircle, Gamepad2 } from 'lucide-react';

export default function App() {
  // Game states hook
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Realtime dashboards synced from Canvas
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [health, setHealth] = useState(100);
  const [nitro, setNitro] = useState(60);

  // Stats gathered after car crash/completion
  const [finalScore, setFinalScore] = useState(0);
  const [finalStats, setFinalStats] = useState<ScoreData>({
    highScore: 0,
    totalDistance: 0,
    carsOvertaken: 0,
    coinsCount: 0,
  });

  // Pre-configured custom car colors matching high-end cyber supercars
  const colorPresets = [
    { name: 'Rosso Corsa', hex: '#dc2626', outline: 'bg-red-600 shadow-red-600/30' },
    { name: 'Neon Lime', hex: '#22c55e', outline: 'bg-green-500 shadow-green-500/30' },
    { name: 'Solar Gold', hex: '#eab308', outline: 'bg-yellow-500 shadow-yellow-500/30' },
    { name: 'Midnight Cyan', hex: '#06b6d4', outline: 'bg-cyan-500 shadow-cyan-500/30' },
    { name: 'Cyber Indigo', hex: '#8b5cf6', outline: 'bg-purple-500 shadow-purple-500/30' },
    { name: 'Pure Quartz', hex: '#f8fafc', outline: 'bg-slate-100 shadow-slate-200/20' },
  ];

  const [selectedColor, setSelectedColor] = useState(colorPresets[0].hex);

  // Track the highest score across sessions to show on landing sidebar
  const [sessionHighScore, setSessionHighScore] = useState<number>(0);

  useEffect(() => {
    const raw = localStorage.getItem('retro_racer_leaderboard');
    if (raw) {
      try {
        const list = JSON.parse(raw);
        if (list.length > 0) {
          setSessionHighScore(list[0].score);
        }
      } catch (e) {}
    }
  }, [gameState]);

  // Canvas callbacks
  const handleScoreUpdate = (
    currentScore: number,
    currentSpeed: number,
    currentDistance: number,
    currentHealth: number,
    currentNitro: number
  ) => {
    setScore(currentScore);
    setSpeed(currentSpeed);
    setDistance(currentDistance);
    setHealth(currentHealth);
    setNitro(currentNitro);
  };

  const handleGameOver = (scoreAchieved: number, finalMetrics: ScoreData) => {
    setFinalScore(scoreAchieved);
    setFinalStats(finalMetrics);
  };

  return (
    <div 
      className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans flex flex-col justify-start items-center p-4 md:p-6 overflow-x-hidden selection:bg-teal-500 selection:text-slate-950"
      id="main-app-root"
      style={{
        backgroundImage: 'radial-gradient(ellipse at top, #0f172a, #020617)',
      }}
    >
      {/* HEADER DECORATION BAR */}
      <header className="w-full max-w-7xl flex justify-between items-center pb-4 mb-4 border-b border-slate-800/60 select-none" id="app-branded-header">
        <div className="flex items-center gap-2" id="header-brand-logo">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950" id="header-brand-icon-box">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none font-sans" id="header-title">
              APEX OVERTAKE
            </h1>
            <span className="text-[10px] text-teal-400 font-mono font-medium tracking-widest" id="header-tagline">
              2D HIGHWAY RACER
            </span>
          </div>
        </div>

        {sessionHighScore > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono" id="header-high-bar">
            <Trophy className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-slate-400">BEST RUN:</span>
            <span className="text-amber-400 font-black">{sessionHighScore.toLocaleString()}</span>
          </div>
        )}
      </header>

      {/* DYNAMIC TWO-COLUMN SPLIT BENTO GRID DESIGN FOR DESKTOP */}
      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="app-responsive-grid">
        
        {/* LEFT COLUMN: RACING PRESET GARAGE AND INSTRUCTIONS (4/12 WIDTH on Desktop) */}
        <section className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1" id="left-sidebar-garage">
          
          {/* VEHICLE CUSTOMIZATION PRESENTS (The "Garage") */}
          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4 select-none" id="garage-customizer-card">
            <div className="flex items-center gap-2" id="garage-title-row">
              <Palette className="w-4.5 h-4.5 text-teal-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300">HIGHWAY RACING GARAGE</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono" id="garage-intro-p">
              Choose your aerodynamic body paint lacquer below. Custom selections persist instantly into the dynamic graphics engine.
            </p>

            {/* Flat presets visual button grid */}
            <div className="grid grid-cols-3 gap-2.5" id="preset-colors-row">
              {colorPresets.map((color, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedColor(color.hex)}
                  className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-teal-500 transition-all ${
                    selectedColor === color.hex 
                      ? 'border-teal-400 bg-teal-950/20 shadow-md shadow-teal-500/5' 
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900'
                  }`}
                  id={`color-preset-btn-${index}`}
                >
                  <span className={`w-5 h-5 rounded-full ${color.outline} shadow-md`} />
                  <span className="text-[10px] text-slate-300 font-semibold font-mono whitespace-nowrap text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-1 flex items-center gap-2 justify-center py-2 px-3 rounded-lg bg-slate-950/40 border border-slate-850" id="garage-active-paint-alert">
              <Car className="w-3.5 h-3.5" style={{ color: selectedColor }} />
              <span className="text-[10px] text-slate-400 font-mono">
                Active Vehicle Color: <span className="text-white font-bold">{colorPresets.find(c => c.hex === selectedColor)?.name}</span>
              </span>
            </div>
          </div>

          {/* DRIVING SAFETY PRECAUTION TIPS */}
          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4 text-xs font-mono text-slate-400" id="driving-safety-precautions-card">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold" id="rules-title-row">
              <HelpCircle className="w-4.5 h-4.5 text-teal-400" />
              <span>RACER PROTOCOLS</span>
            </div>
            
            <div className="space-y-2.5 pl-0.5 leading-relaxed" id="racer-bullet-guidelines">
              <p className="flex items-start gap-1.5">
                <span className="text-teal-400">01.</span>
                <span>Any crash with upcoming highway vehicles or road cones triggers an instant high-speed wreck, ending your run immediately.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-teal-450">02.</span>
                <span>Maintain speed inside the middle lane to scan upcoming lane patterns easily, then drift left/right to close gaps.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-teal-450">03.</span>
                <span>Entering an <span className="text-amber-400 font-bold">Oil Slick</span> will make your vehicle rotate, completely disabling steering controls for a full second.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-teal-450">04.</span>
                <span>Active speed multiplier combos count up on rapid consecutive overtakes. Avoid hitting corners or crashing to preserve multiplier progress.</span>
              </p>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: THE PRIMARY CAR RACING VIEWPORT CANVAS (5/12 WIDTH on Desktop) */}
        <section className="lg:col-span-5 flex flex-col gap-4 items-center justify-center order-1 lg:order-2" id="center-racing-viewport-column">
          
          {/* Sits HUD on top only when driving */}
          {gameState === 'PLAYING' && (
            <HUD
              score={score}
              speed={speed}
              distance={distance}
              health={health}
              nitro={nitro}
            />
          )}

          {/* Standard Canvas Renderer element */}
          <GameCanvas
            gameState={gameState}
            setGameState={setGameState}
            selectedColor={selectedColor}
            onGameOver={handleGameOver}
            onScoreUpdate={handleScoreUpdate}
          />
        </section>

        {/* RIGHT COLUMN: ADDITIONAL OVERLAY PANELS (Leaderboard, Game Over, and Extra Info - 3/12 WIDTH) */}
        <section className="lg:col-span-3 flex flex-col gap-6 order-3" id="right-sidebar">
          {gameState === 'GAMEOVER' ? (
            <GameOver
              score={finalScore}
              stats={finalStats}
              onRestart={() => setGameState('PLAYING')}
              onGoToMenu={() => setGameState('MENU')}
              onLeaderboardChange={() => {
                const raw = localStorage.getItem('retro_racer_leaderboard');
                if (raw) {
                  try {
                    const list = JSON.parse(raw);
                    if (list.length > 0) {
                      setSessionHighScore(list[0].score);
                    } else {
                      setSessionHighScore(0);
                    }
                  } catch (e) {
                    setSessionHighScore(0);
                  }
                } else {
                  setSessionHighScore(0);
                }
              }}
            />
          ) : (
            <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4 select-none text-xs font-mono text-slate-400" id="arcade-stats-panel">
              <span className="font-bold text-slate-300 tracking-wider flex items-center gap-1">
                <Award className="w-4 h-4 text-teal-400" />
                HIGH-SPEED METRICS
              </span>
              
              <div className="flex flex-col gap-3 py-1.5" id="metrics-readout-rows">
                <div className="flex justify-between border-b border-slate-800/50 pb-2" id="metric-odometer">
                  <span>LAST FLIGHT DISTANCE</span>
                  <span className="text-slate-100 font-bold">{finalStats.totalDistance.toFixed(0)}m</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2" id="metric-overtakes">
                  <span>VEHICLES OVERTAKEN</span>
                  <span className="text-cyan-400 font-bold">{finalStats.carsOvertaken} cars</span>
                </div>
                <div className="flex justify-between" id="metric-gold-coins">
                  <span>COINS HARVESTED</span>
                  <span className="text-yellow-400 font-bold">{finalStats.coinsCount} coins</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col gap-1.5 leading-relaxed text-[10px]" id="engine-specs-sheet">
                <span className="font-bold text-amber-500 uppercase">Supercar Chassis Tech Spec</span>
                <p>⚙️ Engine: Twin Turbocharged Radial Synth</p>
                <p>⚙️ Acceleration: 1.8G (Interactive Thruster Nitro)</p>
                <p>⚙️ Steering: Slide responsive 105ms Lane Switcher</p>
                <p>⚙️ Drag: High coefficient carbon rear spoiler wing</p>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
