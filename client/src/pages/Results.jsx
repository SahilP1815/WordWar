import React, { useState, useEffect } from 'react';
import ResultsPanel from '../components/ResultsPanel';
import ChallengePanel from '../components/ChallengePanel';
import { ArrowRight, ShieldAlert, Award, Clock } from 'lucide-react';

export default function Results({
  roundNumber,
  answers,
  scores,
  challengeEndsAt,
  myPlayerId,
  players,
  isHost,
  activeChallenges,
  onRaiseChallenge,
  onResolveChallenge,
  onStartNextRound,
  onStopGame,
  scoresLocked,
  leaderboard
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((challengeEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [challengeEndsAt]);

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
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
              ROUND {roundNumber} COMPLETED
            </span>
            <h2 className="text-3xl font-logo tracking-wide text-slate-100 text-glow-indigo">REVIEW RESULTS</h2>
            <p className="text-slate-400 text-sm font-semibold">Dispute invalid answers or wait for host validation</p>
          </div>

          <div className="flex items-center gap-4">
            {timeLeft > 0 ? (
              <div className="flex flex-col items-center bg-rose-500/10 border border-rose-500/20 px-5 py-3 rounded-2xl shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12} className="animate-pulse" /> DISPUTE WINDOW
                </span>
                <span className="text-2xl font-cyber font-black text-rose-400 leading-none mt-1">
                  {timeLeft}s
                </span>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-2xl">
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Award size={16} /> Scores Locked
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Challenge Panel */}
        {activeChallenges && activeChallenges.length > 0 && (
          <ChallengePanel
            challenges={activeChallenges}
            players={players}
            isHost={isHost}
            onResolve={onResolveChallenge}
          />
        )}

        {/* Results Panel */}
        <ResultsPanel
          answers={answers}
          scores={scores}
          myPlayerId={myPlayerId}
          onRaiseChallenge={onRaiseChallenge}
          activeChallenges={activeChallenges}
        />

        {/* Next Round Controller */}
        {scoresLocked && (
          <div className="glass rounded-3xl p-6 border border-indigo-500/20 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-200">Ready for the next round?</h4>
              <p className="text-xs text-slate-400">All disputes resolved. Results flushed to sheet.</p>
            </div>
            {isHost ? (
              <div className="flex gap-3">
                <button
                  onClick={onStopGame}
                  className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 font-bold rounded-xl flex items-center gap-2 btn-gaming-danger"
                >
                  End Game Early
                </button>
                <button
                  onClick={onStartNextRound}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl flex items-center gap-2 btn-gaming"
                >
                  Start Next Round <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 font-semibold animate-pulse">
                Waiting for host to start next round...
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
