import React from 'react';
import { Users, Shield, ArrowRight, Copy, Check, UserMinus } from 'lucide-react';
import { useState } from 'react';
import AlphabetParticles from '../components/AlphabetParticles';

export default function Lobby({ roomId, players, isHost, onStartGame, playerLimit = 10, maxRounds = 15, myPlayerId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomId);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = roomId;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950 retro-grid">
      <AlphabetParticles maxParticles={15} />
      <div className="glowing-orbs">
        <div className="orb orb-indigo" />
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>

      <div className="w-full max-w-xl z-10">
        <div className="glass rounded-3xl p-8 border border-indigo-500/20 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              LOBBY ROOM
            </span>
            <h2 className="text-3xl font-logo tracking-wide text-slate-100 text-glow-indigo">WAITING FOR PLAYERS</h2>
            <p className="text-slate-400 text-sm font-semibold">Share the room code to invite others</p>
          </div>

          {/* Room Code Showcase */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Room Code</span>
              <span className="text-3xl font-cyber font-black text-slate-200 tracking-widest uppercase">{roomId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-xl btn-gaming-secondary transition-all flex items-center gap-2 text-sm font-bold"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy Code
                </>
              )}
            </button>
          </div>

          {/* Room Settings Info */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Room Capacity</span>
              <span className="text-base font-bold text-slate-200">{players.filter(p => !p.isHost).length} / {playerLimit} Players</span>
            </div>
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Match Length</span>
              <span className="text-base font-bold text-slate-200">{maxRounds} Rounds</span>
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                <Users size={16} /> Joined Players ({players.filter(p => !p.isHost).length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
              {players.map((p) => {
                const isMe = p.playerId === myPlayerId;
                return (
                  <div
                    key={p.playerId}
                    className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                      isMe
                        ? 'bg-indigo-500/10 border-2 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'bg-slate-900/40 border border-slate-800/80'
                    }`}
                  >
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      {p.playerName}
                      {isMe && (
                        <span className="text-[9px] font-extrabold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </span>
                    {p.isHost ? (
                      <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                        <Shield size={10} /> Host
                      </span>
                    ) : (
                      isHost && (
                        <button
                          onClick={() => onKickPlayer(p.playerId)}
                          className="text-rose-400 hover:text-rose-350 bg-rose-500/10 hover:bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center animate-in fade-in duration-200"
                          title="Kick Player"
                        >
                          <UserMinus size={18} />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800/50">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={players.filter(p => !p.isHost).length < 1}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl btn-gaming transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={players.filter(p => !p.isHost).length < 1 ? "Waiting for players to join..." : "Start the game!"}
              >
                {players.filter(p => !p.isHost).length < 1 ? "Waiting for players..." : "Start Battle"} <ArrowRight size={18} />
              </button>
            ) : (
              <div className="text-center py-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-indigo-300 text-sm font-bold animate-pulse">
                Waiting for host to start the game...
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
