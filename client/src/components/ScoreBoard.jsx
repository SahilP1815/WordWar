import React from 'react';
import { Trophy, Clock, Milestone, Sparkles, Medal } from 'lucide-react';

export default function ScoreBoard({ leaderboard }) {
  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_#000]';
    if (rank === 2) return 'bg-slate-300 text-black border-2 border-black shadow-[2px_2px_0px_#000]';
    if (rank === 3) return 'bg-amber-700 text-white border-2 border-black shadow-[2px_2px_0px_#000]';
    return 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]';
  };

  const getRowStyle = (rank) => {
    if (rank === 1) return 'bg-amber-100 border-4 border-black shadow-[6px_6px_0px_#ffe800] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#ffe800]';
    if (rank === 2) return 'bg-slate-100 border-4 border-black shadow-[6px_6px_0px_#00c3ff] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#00c3ff]';
    if (rank === 3) return 'bg-amber-50 border-4 border-black shadow-[6px_6px_0px_#ff3b30] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#ff3b30]';
    return 'bg-white border-4 border-black shadow-[4px_4px_0px_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000]';
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-logo text-3xl text-black flex items-center gap-3 tracking-wide" style={{ textShadow: '4px 4px 0px #00c3ff', WebkitTextStroke: '2px #000' }}>
          <Trophy className="text-amber-400 drop-shadow-none" size={32} /> HALL OF FAME
        </h3>
        <div className="px-4 py-1.5 rounded-full bg-indigo-100 border-2 border-black text-black text-xs font-bold tracking-widest uppercase shadow-[2px_2px_0px_#000]">
          Tie-Breaker Active
        </div>
      </div>

      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center gap-4">
            <Trophy className="text-slate-700" size={48} />
            <p className="text-slate-500 italic font-medium">No warriors have fallen yet...</p>
          </div>
        ) : (
          leaderboard.map((row, idx) => (
            <div 
              key={row.playerId}
              className={`relative flex items-center justify-between p-4 sm:p-5 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl overflow-hidden backdrop-blur-sm animate-fade-in-up ${getRowStyle(row.rank)}`}
              style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
            >
              {/* Subtle animated gradient background for top 3 */}
              {(row.rank <= 3) && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              )}
              
              <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                <div className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full font-black text-xl flex-shrink-0 ${getRankBadge(row.rank)}`}>
                  {row.rank === 1 ? <Trophy size={24} /> : row.rank === 2 || row.rank === 3 ? <Medal size={24} /> : row.rank}
                </div>
                <div>
                  <h4 className={`font-black text-2xl sm:text-3xl tracking-tight mb-1 ${row.rank === 1 ? 'text-amber-400' : 'text-black'}`} style={row.rank === 1 ? { WebkitTextStroke: '1px #000', textShadow: '3px 3px 0px #000' } : {}}>
                    {row.playerName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-black">
                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-100 border-2 border-black px-2 py-1 rounded-md">
                      <Sparkles size={14} /> {row.totalUnique || 0} Unique
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-100 border-2 border-black px-2 py-1 rounded-md">
                      <Clock size={14} /> {row.avgSubmitMs > 0 ? (row.avgSubmitMs / 1000).toFixed(2) + 's' : '-'} Avg
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 relative z-10">
                <div className="text-right hidden md:block opacity-90">
                  <div className="text-[10px] text-black uppercase tracking-widest font-black mb-1">Rounds</div>
                  <div className="text-black font-bold flex items-center justify-end gap-1 text-sm">
                    <Milestone size={14} className="text-indigo-600" /> {row.completedRounds || 0}
                  </div>
                </div>
                <div className="text-right pl-4 sm:pl-6 border-l-2 border-black">
                  <div className="text-[10px] text-black uppercase tracking-widest font-black mb-0.5">Score</div>
                  <div className="text-4xl sm:text-5xl font-black text-purple-600" style={{ textShadow: '2px 2px 0px #000' }}>
                    {row.totalScore}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
