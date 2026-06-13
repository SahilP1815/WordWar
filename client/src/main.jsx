import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useSocket } from './hooks/useSocket';
import { Sun, Moon, BookOpen, X } from 'lucide-react';

// Import Pages
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import WaitingRoom from './pages/WaitingRoom';

// Styles
import './index.css';

function App() {
  const { connected, lastMessage, send, error } = useSocket();

  // Navigation State
  const [phase, setPhase] = useState('HOME'); // HOME, LOBBY, GAME, RESULTS, OVER

  // Rules popover
  const [showRules, setShowRules] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Apply theme to document body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Game details
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [playerLimit, setPlayerLimit] = useState(10);
  const [maxRounds, setMaxRounds] = useState(15);

  // Active round state
  const [roundNumber, setRoundNumber] = useState(0);
  const [letter, setLetter] = useState('A');
  const [startsAt, setStartsAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState({
    name: '',
    place: '',
    animal: '',
    thing: ''
  });
  
  const currentAnswersRef = useRef(currentAnswers);
  useEffect(() => {
    currentAnswersRef.current = currentAnswers;
  }, [currentAnswers]);

  // Results State
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [challengeEndsAt, setChallengeEndsAt] = useState(0);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [scoresLocked, setScoresLocked] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  // Accumulated per-round data for the full-game Excel export
  const [roundHistory, setRoundHistory] = useState([]);

  // Joining state (set immediately when user clicks Join, cleared on server response)
  const [joiningData, setJoiningData] = useState(null); // { roomCode }

  // Local errors
  const [localErr, setLocalErr] = useState('');

  // Handle server events
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Received socket event:', lastMessage);
    const { type } = lastMessage;

    switch (type) {
      case 'room:joined':
        setRoomId(lastMessage.roomId);
        setPlayerId(lastMessage.playerId);
        setIsHost(lastMessage.isHost);
        setPlayers(lastMessage.players || []);
        setPlayerLimit(lastMessage.playerLimit || 10);
        setMaxRounds(lastMessage.maxRounds || 15);
        setPhase('LOBBY');
        setLocalErr('');
        setJoiningData(null); // clear optimistic join state
        break;

      case 'room:players':
        setPlayers(lastMessage.players || []);
        break;

      case 'player:left':
        setPlayers((prev) => prev.filter((p) => p.playerId !== lastMessage.playerId));
        break;

      case 'round:new':
        setRoundNumber(lastMessage.roundNumber);
        setLetter(lastMessage.letter);
        setStartsAt(lastMessage.startsAt);
        setSecondsLeft(60);
        setIsSubmitted(false);
        setIsPaused(false);
        setScoresLocked(false);
        setActiveChallenges([]);
        setCurrentAnswers({ name: '', place: '', animal: '', thing: '' });
        setPhase('GAME');
        break;

      case 'round:tick':
        setSecondsLeft(lastMessage.secondsLeft);
        if (lastMessage.isPaused !== undefined) {
          setIsPaused(lastMessage.isPaused);
        }
        break;

      case 'round:pause_toggled':
        setIsPaused(lastMessage.isPaused);
        break;

      case 'round:letter_changed':
        setLetter(lastMessage.letter);
        if (lastMessage.resetTime) {
          setSecondsLeft(60);
        }
        setIsSubmitted(false);
        setCurrentAnswers({ name: '', place: '', animal: '', thing: '' });
        break;

      case 'round:ended':
        // If not submitted and not the host, auto submit currentAnswers
        if (!isSubmitted && !isHost) {
          send('round:submit', {
            roomId,
            answers: currentAnswersRef.current
          });
          setIsSubmitted(true);
        }
        break;

      case 'results:show':
        setAnswers(lastMessage.answers || {});
        setScores(lastMessage.scores || {});
        setChallengeEndsAt(lastMessage.challengeEndsAt);
        // Accumulate this round into history for the full Excel export
        setRoundHistory((prev) => [
          ...prev.filter((r) => r.roundNumber !== roundNumber), // dedupe on re-render
          {
            roundNumber,
            letter,
            answers: lastMessage.answers || {},
            scores: lastMessage.scores || {},
          },
        ]);
        setPhase('RESULTS');
        break;

      case 'challenge:new':
        setActiveChallenges((prev) => [
          ...prev,
          {
            challengeId: lastMessage.challengeId,
            category: lastMessage.category,
            challengerId: lastMessage.challenger,
            targetPlayerId: lastMessage.target,
            roundId: lastMessage.roundId,
            resolved: false,
            accepted: false
          }
        ]);
        break;

      case 'challenge:resolved':
        setActiveChallenges((prev) => {
          const ch = prev.find((c) => c.challengeId === lastMessage.challengeId);
          if (ch && lastMessage.accepted) {
            setScores((prevScores) => {
              const newScores = { ...prevScores };
              const target = newScores[ch.targetPlayerId];
              if (target) {
                const deducted = target.breakdown[ch.category] || 0;
                return {
                  ...newScores,
                  [ch.targetPlayerId]: {
                    ...target,
                    breakdown: { ...target.breakdown, [ch.category]: 0 },
                    total: target.total - deducted
                  }
                };
              }
              return newScores;
            });
          }

          return prev.map((c) =>
            c.challengeId === lastMessage.challengeId
              ? { ...c, resolved: true, accepted: lastMessage.accepted }
              : c
          );
        });
        break;

      case 'scores:locked':
        setLeaderboard(lastMessage.leaderboard || []);
        setScoresLocked(true);
        break;

      case 'game:over':
        setLeaderboard(lastMessage.finalLeaderboard || []);
        setPhase('OVER');
        
        // Host pushes the final results to Supabase
        if (isHost && lastMessage.finalLeaderboard) {
            import('./supabaseClient').then(({ supabase }) => {
                lastMessage.finalLeaderboard.forEach(async (player) => {
                    if (player.playerName) {
                        console.log("Attempting to save to Supabase for:", player.playerName);
                        const { data, error } = await supabase.from('match_scores').insert({
                            room_code: roomId,
                            player_name: player.playerName,
                            score: player.totalScore,
                            unique_words: player.totalUnique,
                            rank: player.rank
                        });
                        if (error) {
                            console.error("🔥 SUPABASE ERROR:", error.message, error.details, error.hint);
                            alert(`Supabase Error: ${error.message} (Check Console)`);
                        } else {
                            console.log("✅ Successfully saved to Supabase!");
                        }
                    }
                });
            }).catch(err => console.error("Failed to load supabaseClient", err));
        }
        break;

      case 'error':
        setLocalErr(lastMessage.message || 'Unknown error occurred');
        setJoiningData(null); // join failed – go back to Home
        break;

      case 'room:kicked':
        setLocalErr('You have been kicked by the host.');
        setPhase('HOME');
        setRoomId('');
        setPlayerId('');
        setPlayers([]);
        break;

      default:
        break;
    }
  }, [lastMessage, send, isSubmitted, roomId, isHost]);

  // Actions
  const handleCreateRoom = (hostName, limit, rounds, duration) => {
    send('room:create', { hostName, playerLimit: limit, maxRounds: rounds, roundDuration: duration });
  };

  const handleJoinRoom = (code, playerName) => {
    // Immediately show the waiting room (optimistic UI) before server confirms
    setJoiningData({ roomCode: code.trim().toUpperCase() });
    setLocalErr('');
    send('room:join', { roomId: code.trim().toUpperCase(), playerName });
  };

  const handleStartGame = () => {
    send('round:start', { roomId });
  };

  const handleKickPlayer = (targetId) => {
    send('room:kick', { targetId });
  };

  const handleAnswersSubmit = (ans) => {
    send('round:submit', { roomId, answers: ans });
    setIsSubmitted(true);
  };

  const handleRaiseChallenge = (category, targetPlayer) => {
    send('challenge:raise', { roomId, category, targetPlayer });
  };

  const handleResolveChallenge = (challengeId, decision) => {
    send('challenge:resolve', { roomId, challengeId, decision });
  };

  const handleGoHome = () => {
    setPhase('HOME');
    setRoomId('');
    setPlayerId('');
    setIsHost(false);
    setPlayers([]);
    setRoundNumber(0);
    setIsSubmitted(false);
    setScoresLocked(false);
    setActiveChallenges([]);
    setLeaderboard([]);
    setRoundHistory([]);
  };

  return (
    <>
      {/* Theme Toggle Button Removed for Comic Theme */}

      {/* Top-right corner: WS badge + Rules button (home only) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">

        {/* Rules button — only on HOME */}
        {phase === 'HOME' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              title="How to play"
            >
              <BookOpen size={13} /> How to Play
            </button>

            {/* Popover */}
            {showRules && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[99998]"
                  onClick={() => setShowRules(false)}
                />
                <div className="absolute right-0 top-10 z-[99999] w-80 bg-white border-2 border-indigo-200 rounded-2xl shadow-2xl p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <BookOpen size={14} /> Game Rules
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowRules(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Rules list */}
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">1</span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        Each round a <span className="text-indigo-600 font-bold">random letter</span> is picked. Fill in all 4 categories — <span className="font-bold text-slate-900">Person Name, Place, Animal, and Object/Thing</span> — with words starting with that letter.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">2</span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        <span className="text-emerald-600 font-bold">10 pts</span> for a unique answer nobody else wrote · <span className="text-amber-600 font-bold">5 pts</span> for a duplicate · <span className="text-slate-500 font-bold">0 pts</span> for blank or invalid words.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">3</span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        After each round, dispute wrong answers during the <span className="text-rose-600 font-bold">challenge window</span>. The host resolves disputes. The player with the <span className="text-amber-600 font-bold">highest total score</span> at the end wins!
                      </p>
                    </li>
                  </ol>

                  {/* Scoring legend */}
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-around gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Unique = 10
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Dupe = 5
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 border border-slate-300 px-2 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Invalid = 0
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* WS Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold backdrop-blur-md">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className={connected ? 'text-emerald-400' : 'text-rose-400'}>
            {connected ? 'Server Connected' : 'Server Disconnected'}
          </span>
        </div>

      </div>

      {phase === 'HOME' && (
        <Home
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={localErr || error}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {/* Optimistic: show WaitingRoom immediately when Join Battle is clicked */}
      {joiningData && phase === 'HOME' && (
        <WaitingRoom
          roomId={joiningData.roomCode}
          players={[]}
          maxRounds={maxRounds}
          isConnecting={true}
        />
      )}

      {phase === 'LOBBY' && (
        isHost ? (
          <Lobby
            roomId={roomId}
            players={players}
            isHost={isHost}
            onStartGame={handleStartGame}
            onKickPlayer={handleKickPlayer}
            playerLimit={playerLimit}
            maxRounds={maxRounds}
          />
        ) : (
          <WaitingRoom
            roomId={roomId}
            players={players}
            maxRounds={maxRounds}
          />
        )
      )}

      {phase === 'GAME' && (
        <Game
          roundNumber={roundNumber}
          letter={letter}
          startsAt={startsAt}
          secondsLeft={secondsLeft}
          onAnswersSubmit={handleAnswersSubmit}
          isSubmitted={isSubmitted}
          isHost={isHost}
          isPaused={isPaused}
          onStopRound={() => send('round:stop', { roomId })}
          onStopGame={() => send('game:stop', { roomId })}
          onTogglePause={() => send('round:toggle_pause', { roomId })}
          onChangeLetter={(l) => send('round:change_letter', { roomId, letter: l })}
          maxRounds={maxRounds}
          answers={currentAnswers}
          setAnswers={setCurrentAnswers}
          players={players}
        />
      )}

      {phase === 'RESULTS' && (
        <Results
          roundNumber={roundNumber}
          answers={answers}
          scores={scores}
          challengeEndsAt={challengeEndsAt}
          myPlayerId={playerId}
          players={players}
          isHost={isHost}
          activeChallenges={activeChallenges}
          onRaiseChallenge={handleRaiseChallenge}
          onResolveChallenge={handleResolveChallenge}
          onStartNextRound={handleStartGame}
          onStopGame={() => send('game:stop', { roomId })}
          scoresLocked={scoresLocked}
          leaderboard={leaderboard}
          maxRounds={maxRounds}
          roomId={roomId}
        />
      )}

      {phase === 'OVER' && (
        <Leaderboard
          leaderboard={leaderboard}
          onGoHome={handleGoHome}
          myPlayerId={playerId}
          isHost={isHost}
          roomId={roomId}
          roundHistory={roundHistory}
        />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
