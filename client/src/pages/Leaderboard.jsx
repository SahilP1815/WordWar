import React from 'react';
import ScoreBoard from '../components/ScoreBoard';
import { Trophy, RefreshCw, Sparkles, Home, Download } from 'lucide-react';
import { downloadFullResults } from '../utils/downloadResults';

export default function Leaderboard({ leaderboard, onGoHome, myPlayerId, isHost, roomId, roundHistory = [] }) {
  const winner = leaderboard[0];

  const hasPlayedAudioRef = React.useRef(false);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    if (isHost) return;
    if (!leaderboard || leaderboard.length === 0) return;
    if (hasPlayedAudioRef.current) return;
    hasPlayedAudioRef.current = true;

    // Check if the current player is rank 1 or 2
    const isTopTwo = leaderboard.some(p => p.playerId === myPlayerId && (p.rank === 1 || p.rank === 2));

    const audioUrl = isTopTwo
      ? 'https://www.myinstants.com/media/sounds/7-crore-kbc.mp3'
      : 'https://www.myinstants.com/media/sounds/faaah.mp3';

    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    audioRef.current = audio;

    audio.play().catch(err => {
      console.warn("Audio playback was blocked or failed:", err);
    });

    // Cleanup: stop audio if user navigates away before it finishes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [leaderboard, myPlayerId, isHost]);

  // Stop audio immediately and navigate home
  const handleGoHome = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    onGoHome();
  };

  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden flex flex-col items-center justify-center">

      <div className="w-full max-w-3xl z-10 space-y-8">
        
        {/* Winner Banner */}
        {winner && (
          <div className="glass bg-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden animate-fade-in-up">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-400 border-[4px] border-black text-black mb-6 shadow-[6px_6px_0px_#000]">
                <Trophy size={48} />
              </div>

              <span className="text-sm font-black uppercase tracking-[0.3em] text-black block mb-2">
                ★ GRAND CHAMPION ★
              </span>
              <h1 className="text-6xl md:text-8xl font-logo text-amber-400 mb-6" style={{ textShadow: '6px 6px 0px #000', WebkitTextStroke: '3px #000' }}>
                {winner.playerName}
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-black text-sm md:text-base font-bold">
                <span className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]">
                  Total Score <strong className="text-indigo-600 font-logo text-2xl" style={{ WebkitTextStroke: '1px #000' }}>{winner.totalScore}</strong>
                </span>
                <span className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]">
                  Unique Words <strong className="text-emerald-500 font-logo text-2xl" style={{ WebkitTextStroke: '1px #000' }}>{winner.totalUnique}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Full Ranks */}
        <ScoreBoard leaderboard={leaderboard} />

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          {isHost && (
            <button
              type="button"
              onClick={() => downloadFullResults(leaderboard, roundHistory, roomId)}
              className="px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
              title="Download full results as Excel (.xlsx)"
            >
              <Download size={18} /> Download Full Results
            </button>
          )}
          <button
            type="button"
            onClick={handleGoHome}
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl flex items-center gap-2 btn-gaming-secondary"
          >
            <Home size={18} /> Return to Home
          </button>
        </div>

      </div>
    </div>
  );
}
