import React from 'react';
import { Users, Shield, RefreshCw, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import AlphabetParticles from '../components/AlphabetParticles';

export default function WaitingRoom({ roomId, players, maxRounds, isConnecting = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950 retro-grid">
      <AlphabetParticles maxParticles={12} />
      <div className="glowing-orbs">
        <div className="orb orb-indigo" />
        <div className="orb orb-violet" />
        <div className="orb orb-cyan" />
      </div>

      <div className="w-full max-w-lg z-10">
        <div className="glass rounded-3xl p-8 border border-indigo-500/20 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />

          {/* Animated Spinner Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full border border-indigo-500/25 mb-1">
              <RefreshCw size={32} className="text-indigo-400 animate-spin" />
            </div>
            
            <h2 className="text-3xl font-logo tracking-widest text-slate-100 text-glow-indigo uppercase">
              {isConnecting ? 'Joining Room...' : 'Waiting Room'}
            </h2>
            <p className="text-indigo-300 text-sm font-semibold tracking-wide animate-pulse">
              {isConnecting
                ? 'Connecting to the battle server...'
                : 'Waiting for the host to start the battle...'}
            </p>
          </div>

          {/* Room Summary */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">ROOM CODE</span>
              <span className="text-2xl font-cyber font-black text-indigo-400 tracking-wider uppercase">{roomId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-slate-100 rounded-xl border border-slate-700/50 transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Code
                </>
              )}
            </button>
          </div>

          {/* Match Settings Info */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Battle Duration</span>
            <span className="text-sm font-bold text-slate-300">{maxRounds} Rounds of Word War</span>
          </div>

          {/* Player list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Users size={14} /> Ready Players ({players.filter(p => !p.isHost).length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
              {isConnecting ? (
                <div className="col-span-2 text-center py-4">
                  <span className="text-slate-500 text-sm italic animate-pulse">Establishing connection...</span>
                </div>
              ) : players.length === 0 ? (
                <div className="col-span-2 text-center py-4">
                  <span className="text-slate-500 text-sm italic">No players yet...</span>
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.playerId}
                    className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-200 text-sm">{p.playerName}</span>
                    {p.isHost && (
                      <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 uppercase tracking-wider">
                        <Shield size={8} /> Host
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
