import React from 'react';
import { AlertTriangle, Award, ShieldAlert, User } from 'lucide-react';

export default function ResultsPanel({ answers, scores, myPlayerId, onRaiseChallenge, activeChallenges }) {
  const categories = ['name', 'place', 'animal', 'thing'];

  const getPointsColor = (pts) => {
    if (pts === 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (pts === 5) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-500 bg-slate-500/10 border-slate-500/10';
  };

  const isChallenged = (targetPlayerId, category) => {
    return activeChallenges?.some(ch => ch.targetPlayerId === targetPlayerId && ch.category === category);
  };

  // Sort players by total score in this round
  const sortedPlayerIds = Object.keys(scores).sort((a, b) => {
    const scoreA = scores[a];
    const scoreB = scores[b];
    if (scoreB.total !== scoreA.total) {
      return scoreB.total - scoreA.total;
    }
    if (scoreB.uniqueCount !== scoreA.uniqueCount) {
      return scoreB.uniqueCount - scoreA.uniqueCount;
    }
    return (scoreA.submittedAt || 0) - (scoreB.submittedAt || 0);
  });

  return (
    <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
          Round Standings & Answers
        </h3>
        <span className="text-xs text-slate-400">
          Dispute invalid answers or wait for host validation
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="py-4 px-4 text-center w-[70px]">Rank</th>
              <th className="py-4 px-6 min-w-[150px]">Candidate</th>
              <th className="py-4 px-6 min-w-[160px]">Person Name</th>
              <th className="py-4 px-6 min-w-[160px]">Place / City / Country</th>
              <th className="py-4 px-6 min-w-[160px]">Animal</th>
              <th className="py-4 px-6 min-w-[160px]">Object / Thing</th>
              <th className="py-4 px-6 text-center min-w-[100px]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedPlayerIds.map((pid, index) => {
              const scoreData = scores[pid];
              const isMe = pid === myPlayerId;
              const rank = index + 1;

              return (
                <tr 
                  key={pid} 
                  className={`transition-colors duration-200 hover:bg-slate-900/20 ${
                    isMe ? 'bg-indigo-950/10' : ''
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold ${
                      rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      rank === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                      rank === 3 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                      'bg-slate-800/40 text-slate-400 border border-slate-800/60'
                    }`}>
                      {rank}
                    </span>
                  </td>

                  {/* Candidate Name */}
                  <td className="py-4 px-6 font-semibold">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isMe ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <User size={14} />
                      </div>
                      <span className={`truncate max-w-[120px] ${isMe ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                        {scoreData.playerName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categories */}
                  {categories.map((cat) => {
                    const playerAns = answers[pid]?.[cat] || '';
                    const catScore = scoreData.breakdown[cat] || 0;
                    const challenged = isChallenged(pid, cat);

                    return (
                      <td key={cat} className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-bold text-slate-200 text-sm tracking-wide truncate max-w-[180px]">
                            {playerAns.trim() ? playerAns : <span className="text-slate-600 italic font-normal">No Answer</span>}
                          </span>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPointsColor(catScore)}`}>
                              {catScore} pts
                            </span>

                            {challenged ? (
                              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5">
                                <ShieldAlert size={10} className="animate-pulse" /> Challenged
                              </span>
                            ) : (
                              playerAns.trim() && !isMe && (
                                <button
                                  onClick={() => onRaiseChallenge(cat, pid)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold hover:underline flex items-center gap-0.5 active:scale-95 transition-all"
                                  title="Dispute this answer"
                                >
                                  <AlertTriangle size={10} /> Dispute
                                </button>
                              )
                            )}
                            {catScore === 10 && !challenged && (
                              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5" title="Unique answer">
                                <Award size={10} /> Unique
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Total Score */}
                  <td className="py-4 px-6 text-center font-bold text-slate-100 text-base">
                    <span className="bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
                      {scoreData.total} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
