import React, { useState } from 'react';
import { Play, UserPlus, Info, Zap, Sun, Moon } from 'lucide-react';
import AlphabetParticles from '../components/AlphabetParticles';

export default function Home({ onCreateRoom, onJoinRoom, error, isDarkMode, setIsDarkMode }) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoin, setIsJoin] = useState(false);
  const [playerLimit, setPlayerLimit] = useState(10);
  const [maxRounds, setMaxRounds] = useState(8);
  const [roundDuration, setRoundDuration] = useState(30);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isJoin) {
      if (!roomId.trim()) return;
      onJoinRoom(roomId.trim().toUpperCase(), name.trim());
    } else {
      const finalLimit = playerLimit === '' || playerLimit < 2 ? 10 : playerLimit;
      onCreateRoom(name.trim(), finalLimit, maxRounds, roundDuration);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 retro-grid ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>

      <AlphabetParticles isDarkMode={isDarkMode} />

      {/* Glowing Orbs */}
      {isDarkMode && (
        <div className="glowing-orbs">
          <div className="orb orb-indigo" />
          <div className="orb orb-violet" />
          <div className="orb orb-cyan" />
        </div>
      )}

      {/* Background Gradients (Light Mode fallback) */}
      {!isDarkMode && (
        <>
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none bg-indigo-300/30" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none bg-violet-300/30" />
        </>
      )}

      <div className="w-full max-w-md z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className={`text-7xl font-logo tracking-wider bg-clip-text text-transparent bg-gradient-to-r transition-colors duration-300 pb-1 ${
            isDarkMode ? 'from-indigo-400 via-purple-300 to-pink-400 text-glow-indigo' : 'from-indigo-700 via-purple-700 to-pink-700'
          }`}>
            WORD WAR
          </h1>
          <p className={`mt-2 text-sm font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            THE ULTIMATE MULTIPLAYER WORD BATTLE
          </p>
        </div>

        {/* Card */}
        <div className={`rounded-3xl p-8 border transition-all duration-300 relative ${
          isDarkMode 
            ? 'glass border-indigo-500/20 shadow-2xl shadow-indigo-950/20' 
            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/30'
        }`}>
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <div className={`flex border-b mb-6 pb-2 transition-colors duration-300 ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setIsJoin(false)}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                !isJoin 
                  ? 'border-indigo-500 text-indigo-400' 
                  : isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Host Match
            </button>
            <button
              type="button"
              onClick={() => setIsJoin(true)}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                isJoin 
                  ? 'border-indigo-500 text-indigo-400' 
                  : isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Join Match
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Your Gamer Nickname
              </label>
              <input
                type="text"
                required
                maxLength={15}
                placeholder="e.g. Speedster"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 transition-all font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isDarkMode 
                    ? 'bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-900' 
                    : 'bg-slate-100 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                }`}
              />
            </div>

            {!isJoin && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Max Players
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={playerLimit}
                    onChange={(e) => setPlayerLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Custom"
                    className={`w-full border rounded-xl px-3 py-3 transition-all font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                      isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50 text-slate-200 focus:border-indigo-500 focus:bg-slate-900' 
                        : 'bg-slate-100 border-slate-300 text-slate-800 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Total Rounds
                  </label>
                  <select
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(Number(e.target.value))}
                    className={`w-full border rounded-xl px-2 py-3 transition-all font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                      isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50 text-slate-200 focus:border-indigo-500 focus:bg-slate-900' 
                        : 'bg-slate-100 border-slate-300 text-slate-800 focus:border-indigo-500 focus:bg-white'
                    }`}
                  >
                    <option value={5}>5 Rounds</option>
                    <option value={8}>8 Rounds</option>
                    <option value={10}>10 Rounds</option>
                    <option value={12}>12 Rounds</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Round Time
                  </label>
                  <select
                    value={roundDuration}
                    onChange={(e) => setRoundDuration(Number(e.target.value))}
                    className={`w-full border rounded-xl px-2 py-3 transition-all font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                      isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50 text-slate-200 focus:border-indigo-500 focus:bg-slate-900' 
                        : 'bg-slate-100 border-slate-300 text-slate-800 focus:border-indigo-500 focus:bg-white'
                    }`}
                  >
                    <option value={10}>10s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={40}>40s</option>
                  </select>
                </div>
              </div>
            )}

            {isJoin && (
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Room Code (6 digits)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. AX92TR"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 transition-all font-cyber font-bold tracking-widest text-center uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-900' 
                      : 'bg-slate-100 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl btn-gaming transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isJoin ? (
                <>
                  <UserPlus size={18} /> Join Battle
                </>
              ) : (
                <>
                  <Play size={18} fill="white" /> Create Battle
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className={`flex items-center justify-center gap-2 mt-8 text-xs transition-colors duration-300 ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <Info size={14} />
          <span>Complete {!isJoin ? `${maxRounds} rounds` : 'all rounds'} of Name-Place-Animal-Thing to win!</span>
        </div>
      </div>
    </div>
  );
}
