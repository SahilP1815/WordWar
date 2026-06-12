import React, { useState, useEffect } from 'react';
import Timer from '../components/Timer';
import AnswerForm from '../components/AnswerForm';
import { RefreshCw, Edit2, Shield, Users, Zap } from 'lucide-react';

export default function Game({ roundNumber, letter, startsAt, secondsLeft, onAnswersSubmit, isSubmitted, isHost, isPaused, onStopRound, onStopGame, onTogglePause, onChangeLetter, maxRounds = 15, answers, setAnswers, players = [] }) {
  const [preCountdown, setPreCountdown] = useState(0);
  const [showNotice, setShowNotice] = useState(false);
  const [prevLetter, setPrevLetter] = useState(letter);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((startsAt - Date.now()) / 1000));
      setPreCountdown(diff);
      if (diff <= 0) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [startsAt]);

  const active = preCountdown <= 0;

  useEffect(() => {
    if (active && letter !== prevLetter) {
      setShowNotice(true);
      setPrevLetter(letter);
      const t = setTimeout(() => setShowNotice(false), 4000);
      return () => clearTimeout(t);
    }
  }, [letter, active, prevLetter]);

  // Auto-submit only for non-host players when timer hits 0
  useEffect(() => {
    if (isHost) return;
    if (secondsLeft === 0 && !isSubmitted && !isPaused && active) {
      onAnswersSubmit(answers);
    }
  }, [secondsLeft, isSubmitted, isPaused, active, answers, onAnswersSubmit, isHost]);

  if (!active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950 retro-grid">
        <div className="glowing-orbs">
          <div className="orb orb-indigo" />
          <div className="orb orb-violet" />
          <div className="orb orb-cyan" />
        </div>

        <div className="text-center z-10 space-y-4 animate-pulse">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/30">
            {isHost ? '🎮 HOSTING ROUND' : 'GET READY TO BATTLE'}
          </span>
          <h2 className="text-8xl font-logo text-slate-100 tracking-wide text-glow-indigo">
            ROUND {roundNumber}
          </h2>
          <p className="text-slate-300 text-lg font-semibold">
            Starting in <span className="font-cyber font-black text-pink-400 text-3xl text-glow-rose">{preCountdown}s</span>...
          </p>
        </div>
      </div>
    );
  }

  // ── HOST VIEW ─────────────────────────────────────────────────────────────
  if (isHost) {
    const nonHostPlayers = players.filter(p => !p.isHost);
    return (
      <div className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-slate-950 retro-grid">
        <div className="glowing-orbs">
          <div className="orb orb-indigo" />
          <div className="orb orb-violet" />
          <div className="orb orb-cyan" />
        </div>

        <div className="max-w-3xl mx-auto z-10 relative space-y-6">

          {/* Host Badge */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="flex items-center gap-2 bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs font-black uppercase tracking-widest px-5 py-2 rounded-full">
              <Shield size={14} /> Host Control Panel
            </span>
          </div>

          {/* Main Control Card */}
          <div className="glass border border-indigo-500/20 rounded-3xl p-8 shadow-2xl space-y-6">

            {/* Round Info Row */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              {/* Active Letter + Change Controls */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Letter</span>
                  <div className="flex items-center gap-3">
                    <span className="text-7xl font-cyber font-black text-indigo-400 text-glow-indigo leading-none">{letter}</span>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => onChangeLetter('')}
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors border border-slate-700/50"
                        title="Randomize Letter"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => {
                          const l = prompt('Enter a new letter (A-Z):');
                          if (l && l.length > 0 && /[a-zA-Z]/.test(l[0])) {
                            onChangeLetter(l.toUpperCase()[0]);
                          }
                        }}
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors border border-slate-700/50"
                        title="Set Specific Letter"
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-16 w-px bg-slate-800" />

                {/* Round Progress */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Round</span>
                  <span className="text-3xl font-cyber font-bold text-slate-200">
                    {roundNumber} <span className="text-sm text-slate-500">/ {maxRounds}</span>
                  </span>
                </div>
              </div>

              {/* Timer */}
              <Timer secondsLeft={secondsLeft} totalSeconds={60} />
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Players in Room */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-slate-400" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Players ({nonHostPlayers.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {nonHostPlayers.map(p => (
                  <span key={p.playerId} className="px-3 py-1.5 bg-slate-800/60 text-slate-300 text-xs font-bold rounded-lg border border-slate-700/50">
                    {p.playerName}
                  </span>
                ))}
                {nonHostPlayers.length === 0 && (
                  <span className="text-slate-500 text-sm italic">No players in room yet...</span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Host Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onTogglePause}
                className="flex-1 px-6 py-4 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 rounded-2xl text-sm font-bold transition-all btn-gaming-secondary flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                {isPaused ? 'Resume Round' : 'Pause Round'}
              </button>
              <button
                onClick={onStopRound}
                className="flex-1 px-6 py-4 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 rounded-2xl text-sm font-bold btn-gaming-danger flex items-center justify-center gap-2"
              >
                End Round Early
              </button>
              <button
                onClick={onStopGame}
                className="px-6 py-4 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 hover:border-rose-600/70 text-rose-400 rounded-2xl text-xs font-bold btn-gaming-secondary"
              >
                End Game
              </button>
            </div>
          </div>

          {/* Info note */}
          <p className="text-center text-slate-500 text-xs">
            You are the host. Players are answering now — manage the round above.
          </p>
        </div>

        {/* Paused Overlay for host */}
        {isPaused && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-7xl font-logo text-amber-500 tracking-wider text-glow-rose animate-pulse">PAUSED</h2>
              <p className="text-amber-300/80 text-sm font-bold uppercase tracking-widest">Round is paused — players are waiting</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4 z-10">
              <button
                onClick={onTogglePause}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-lg font-bold btn-gaming-success"
              >
                Resume Round
              </button>
              <div className="flex flex-col gap-3">
                <button
                  onClick={onStopRound}
                  className="px-6 py-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 rounded-xl text-sm font-bold btn-gaming-danger"
                >
                  End Round Early
                </button>
                <button
                  onClick={onStopGame}
                  className="px-6 py-2 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 hover:border-rose-600/70 text-rose-400 rounded-xl text-xs font-bold btn-gaming-secondary"
                >
                  End Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Letter Change Notice */}
        {showNotice && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 backdrop-blur-md text-white px-8 py-3 rounded-full shadow-2xl shadow-indigo-900/50 animate-bounce font-extrabold border-2 border-indigo-400 flex items-center gap-2">
            <span>⚠️</span> Letter changed to "{letter}" & Time reset!
          </div>
        )}
      </div>
    );
  }

  // ── PLAYER VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-slate-950 retro-grid">
      <div className="glowing-orbs">
        <div className="orb orb-indigo" />
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>

      <div className="max-w-4xl mx-auto z-10 relative space-y-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-slate-950/60 border border-indigo-500/20 rounded-3xl p-6 glass shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ACTIVE LETTER</span>
              <div className="flex items-center gap-4">
                <span className="text-6xl font-cyber font-black text-indigo-400 text-glow-indigo leading-none">{letter}</span>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Round Progress</span>
              <span className="text-2xl font-cyber font-bold text-slate-200">{roundNumber} <span className="text-sm text-slate-500">/ {maxRounds}</span></span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-end">
            <Timer secondsLeft={secondsLeft} totalSeconds={60} />
          </div>
        </div>

        {/* Instructions banner */}
        <div className="glass rounded-2xl p-4 border border-indigo-500/10 flex items-center gap-3">
          <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 text-lg">
            🎮
          </span>
          <span className="text-sm text-slate-300 font-semibold">
            Fill each category with a word starting with the letter <strong className="text-indigo-400 font-bold">"{letter}"</strong>. Double points for completely unique answers!
          </span>
        </div>

        {/* Input Form */}
        <AnswerForm
          roundLetter={letter}
          onSubmit={onAnswersSubmit}
          isSubmitted={isSubmitted}
          answers={answers}
          setAnswers={setAnswers}
        />

      </div>

      {/* Paused Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="text-center space-y-4 animate-pulse mb-8">
            <h2 className="text-7xl font-logo text-amber-500 tracking-wider text-glow-rose">PAUSED</h2>
            <p className="text-amber-300/80 text-sm font-bold uppercase tracking-widest">Waiting for the host to resume...</p>
          </div>
        </div>
      )}

      {/* Letter Change Notice */}
      {showNotice && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 backdrop-blur-md text-white px-8 py-3 rounded-full shadow-2xl shadow-indigo-900/50 animate-bounce font-extrabold border-2 border-indigo-400 flex items-center gap-2">
          <span>⚠️</span> Host changed the letter to "{letter}" & Time reset!
        </div>
      )}
    </div>
  );
}
