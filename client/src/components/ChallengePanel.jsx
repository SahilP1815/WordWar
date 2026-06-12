import React from 'react';
import { Check, X, ShieldAlert, Award } from 'lucide-react';

export default function ChallengePanel({ challenges, players, isHost, onResolve }) {
  const getPlayerName = (pid) => {
    return players.find(p => p.playerId === pid)?.playerName || pid;
  };

  const activeChallenges = challenges.filter(c => !c.resolved);
  const resolvedChallenges = challenges.filter(c => c.resolved);

  return (
    <div className="space-y-6">
      {activeChallenges.length > 0 && (
        <div className="glass border-rose-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-4">
            <ShieldAlert className="animate-bounce" /> Active Disputes ({activeChallenges.length})
          </h3>

          <div className="space-y-4">
            {activeChallenges.map((ch) => (
              <div key={ch.challengeId} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">
                    <span className="font-bold text-indigo-400">{getPlayerName(ch.challengerId)}</span> disputed{' '}
                    <span className="font-bold text-amber-400">{getPlayerName(ch.targetPlayerId)}</span>'s answer
                  </p>
                  <p className="text-lg font-bold text-slate-200 mt-1">
                    Category: <span className="capitalize text-indigo-300">{ch.category}</span>
                  </p>
                </div>

                {isHost ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onResolve(ch.challengeId, true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg flex items-center gap-1 active:scale-95 transition-all text-sm"
                    >
                      <Check size={16} /> Accept (Invalidate)
                    </button>
                    <button
                      onClick={() => onResolve(ch.challengeId, false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg flex items-center gap-1 active:scale-95 transition-all text-sm border border-slate-700"
                    >
                      <X size={16} /> Reject (Valid)
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                    Waiting for Host resolution...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {resolvedChallenges.length > 0 && (
        <div className="glass border-slate-800 rounded-2xl p-6">
          <h3 className="text-md font-bold text-slate-400 flex items-center gap-2 mb-4">
            <Award /> Resolved Disputes ({resolvedChallenges.length})
          </h3>

          <div className="space-y-3">
            {resolvedChallenges.map((ch) => (
              <div key={ch.challengeId} className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3 flex justify-between items-center text-sm">
                <div>
                  <span className="text-slate-400">
                    {getPlayerName(ch.challengerId)} vs {getPlayerName(ch.targetPlayerId)} ({ch.category})
                  </span>
                </div>
                <div>
                  {ch.accepted ? (
                    <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      Accepted (0 pts)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Rejected (Kept pts)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
