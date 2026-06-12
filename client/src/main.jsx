import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useSocket } from './hooks/useSocket';
import { Sun, Moon } from 'lucide-react';

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
  };

  return (
    <>
      {/* Theme Toggle Button Removed for Comic Theme */}

      {/* WS Status Badge */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold backdrop-blur-md">
        <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className={connected ? 'text-emerald-400' : 'text-rose-400'}>
          {connected ? 'Server Connected' : 'Server Disconnected'}
        </span>
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
        />
      )}

      {phase === 'OVER' && (
        <Leaderboard
          leaderboard={leaderboard}
          onGoHome={handleGoHome}
          myPlayerId={playerId}
          isHost={isHost}
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
