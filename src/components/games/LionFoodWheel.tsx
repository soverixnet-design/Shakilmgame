import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Pause, History, Trophy, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../utils/sound';
import { GameRulesModal } from './GameRulesModal';
import { GameHistoryModal } from './GameHistoryModal';
import { GameRankingModal } from './GameRankingModal';

const ITEMS: [string, number, string][] = [
  ['🍗', 45, 'চিকেন'],
  ['🐙', 25, 'অক্টোপাস'],
  ['🐟', 15, 'মাছ'],
  ['🥩', 10, 'স্টেক'],
  ['🍇', 5, 'আঙুর'],
  ['🥬', 5, 'সালাদ পাতা'],
  ['🌽', 5, 'ভুট্টা'],
  ['🍓', 5, 'স্ট্রবেরি'],
];

const CHIPS = [1000, 10000, 50000, 100000, 500000];

interface LionFoodWheelProps {
  onBack: () => void;
}

export const LionFoodWheel: React.FC<LionFoodWheelProps> = ({ onBack }) => {
  const { profile, adjustCoins, saveGameRound, addDemoCoins } = useAuth();
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
  const [bets, setBets] = useState<number[]>(Array(10).fill(0));
  const [lastBets, setLastBets] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<'bet' | 'spin'>('bet');
  const [countdown, setCountdown] = useState<number>(20);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    return 1280 + Math.floor(Math.random() * 20);
  });
  const [recentHistory, setRecentHistory] = useState<number[]>([0, 3, 4, 1, 6]);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [winPopup, setWinPopup] = useState<{ amount: number; item: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('বেট ধরুন 🦁 সিংহ ফুড হুইল ঘুরবে');

  // Modals
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showRanking, setShowRanking] = useState<boolean>(false);

  const betsRef = useRef(bets);
  betsRef.current = bets;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  const lastBetsRef = useRef(lastBets);
  lastBetsRef.current = lastBets;

  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseRef.current === 'bet') {
        setCountdown((prev) => {
          if (prev <= 5 && prev > 1) {
            sound.countdownTick();
          }
          if (prev <= 1) {
            triggerSpin();
            return 20;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerSpin = () => {
    setPhase('spin');
    setStatusMessage('সিংহ ঘুরছে... ফলাফল নির্ধারণ হচ্ছে 🦁');

    const weights = ITEMS.map((item) => 1 / item[1]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let winningIdx = 7;
    for (let i = 0; i < 8; i++) {
      if ((rand -= weights[i]) < 0) {
        winningIdx = i;
        break;
      }
    }

    let current = Math.floor(Math.random() * 8);
    let stepsRemaining = 24 + ((winningIdx - current + 8) % 8);

    const spinInterval = setInterval(() => {
      current = (current + 1) % 8;
      setHighlightIdx(current);
      sound.tick();
      stepsRemaining--;

      if (stepsRemaining <= 0) {
        clearInterval(spinInterval);
        handleSpinEnd(winningIdx);
      }
    }, 85);
  };

  const handleSpinEnd = (winIdx: number) => {
    const currentBets = betsRef.current;
    setLastBets([...currentBets]);

    const wonItem = ITEMS[winIdx];
    const itemPayout = currentBets[winIdx] * wonItem[1];
    const saladPayout = wonItem[1] === 5 ? Math.floor(currentBets[8] * 1.2) : 0;
    const pizzaPayout = wonItem[1] >= 10 ? Math.floor(currentBets[9] * 4) : 0;
    const totalWin = itemPayout + saladPayout + pizzaPayout;

    const totalBetCost = currentBets.reduce((a, b) => a + b, 0);

    setRecentHistory((prev) => [winIdx, ...prev.slice(0, 7)]);
    setRoundNumber((r) => r + 1);

    if (totalWin > 0) {
      sound.winFanfare();
      setWinPopup({ amount: totalWin, item: wonItem[0] });
      adjustCoins(totalWin, totalWin);
      setStatusMessage(`🎉 সিংহ দান করেছে 🪙 ${totalWin.toLocaleString()}!`);
    } else {
      if (totalBetCost > 0) {
        setStatusMessage(`এবার ভাগ্য খুলেনি 😅 ফলাফল: ${wonItem[0]} ${wonItem[2]}`);
      } else {
        setStatusMessage(`ফলাফল: ${wonItem[0]} ${wonItem[2]} (x${wonItem[1]})`);
      }
    }

    if (totalBetCost > 0) {
      saveGameRound({
        gameType: 'lion_food',
        roundNumber: roundNumber,
        result: `${wonItem[0]} x${wonItem[1]}`,
        betAmount: totalBetCost,
        winAmount: totalWin,
      });
    }

    setTimeout(() => {
      setWinPopup(null);
      setHighlightIdx(null);
      setBets(Array(10).fill(0));
      setPhase('bet');
      setCountdown(20);

      if (autoPlayRef.current && lastBetsRef.current) {
        const rebetTotal = lastBetsRef.current.reduce((a, b) => a + b, 0);
        if (profile.coins >= rebetTotal) {
          adjustCoins(-rebetTotal);
          setBets([...lastBetsRef.current]);
          setStatusMessage('অটো বেট ধরা হয়েছে ▶');
        } else {
          setAutoPlay(false);
          setStatusMessage('কয়েন শেষ হয়ে যাওয়ায় অটো বন্ধ হয়েছে');
        }
      }
    }, 2800);
  };

  const handlePlaceBet = (idx: number) => {
    if (phase !== 'bet') {
      setStatusMessage('বেট বন্ধ, চাকা ঘোরা পর্যন্ত অপেক্ষা করুন');
      return;
    }
    if (profile.coins < selectedChip) {
      setStatusMessage('ওয়ালেটে পর্যাপ্ত কয়েন নেই! কয়েন যোগ করুন +');
      return;
    }

    adjustCoins(-selectedChip);
    sound.betPlace();
    setBets((prev) => {
      const next = [...prev];
      next[idx] += selectedChip;
      return next;
    });
  };

  const fmt = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#0b648c] via-[#104a75] to-[#072440] text-white flex flex-col justify-between pb-6 select-none relative overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between font-bold z-10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* User Coins & Quick Add */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-3 py-1.5 shadow-lg">
          <span className="text-[13px] text-amber-300 font-extrabold flex items-center gap-1">
            🪙 {profile.coins.toLocaleString()}
          </span>
          <button
            onClick={() => addDemoCoins(1000000)}
            title="+১০ লক্ষ কয়েন"
            className="w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-[13px] font-black active:scale-90"
          >
            +
          </button>
        </div>

        {/* Round Counter & Help */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] bg-white/10 px-2.5 py-1 rounded-full text-white/80">
            রাউন্ড #{roundNumber}
          </span>
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Wheel Arena */}
      <div className="relative w-[340px] h-[340px] mx-auto my-2 flex items-center justify-center">
        {/* Soft glow */}
        <div className="absolute inset-4 rounded-full bg-cyan-400/10 blur-[40px] pointer-events-none" />

        {/* 8 Items around the circle */}
        {ITEMS.map((item, idx) => {
          const angle = (idx * 45 - 90) * (Math.PI / 180);
          const radius = 125;
          const x = 170 + radius * Math.cos(angle) - 38;
          const y = 170 + radius * Math.sin(angle) - 38;
          const isHighlighted = highlightIdx === idx;
          const betVal = bets[idx];

          return (
            <button
              key={idx}
              onClick={() => handlePlaceBet(idx)}
              style={{ left: `${x}px`, top: `${y}px` }}
              className={`absolute w-[76px] h-[76px] rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:scale-95
                ${
                  isHighlighted
                    ? 'bg-amber-300 text-black scale-110 shadow-[0_0_30px_#ffd23f] border-4 border-white z-20'
                    : 'bg-gradient-to-b from-[#fff3d6] to-[#e8b878] text-neutral-800 border-3 border-[#b06a2a] shadow-[0_6px_0_rgba(0,0,0,0.35)] hover:scale-105'
                }
              `}
            >
              <span className="text-[32px] leading-none filter drop-shadow">{item[0]}</span>
              <span className="text-[12px] font-black leading-none mt-0.5">x{item[1]}</span>

              {betVal > 0 && (
                <span className="absolute -bottom-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow border border-white">
                  {fmt(betVal)}
                </span>
              )}
            </button>
          );
        })}

        {/* Center Lion Hub */}
        <div className="w-[104px] h-[104px] rounded-full bg-gradient-to-br from-[#ffd98a] to-[#d98b2b] border-4 border-amber-300 shadow-[0_8px_0_rgba(0,0,0,0.4),0_0_24px_rgba(255,180,0,0.5)] flex flex-col items-center justify-center z-10 pointer-events-none">
          <span className="text-[28px] leading-none">🦁</span>
          <div className={`text-[24px] font-black leading-none text-amber-950 mt-1 ${countdown <= 5 && phase === 'bet' ? 'text-red-700 animate-pulse' : ''}`}>
            {phase === 'bet' ? countdown : '🎡'}
          </div>
        </div>
      </div>

      {/* Side Group Bets */}
      <div className="flex justify-center gap-3 my-1">
        <button
          onClick={() => handlePlaceBet(8)}
          className="relative px-5 py-2.5 rounded-2xl bg-white text-neutral-900 border-3 border-amber-400 font-extrabold text-[14px] shadow-[0_5px_0_#b8860b] active:scale-95 transition flex items-center gap-1.5"
        >
          <span>🥗 সালাদ x1.2</span>
          {bets[8] > 0 && (
            <span className="absolute -top-2.5 -right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white">
              {fmt(bets[8])}
            </span>
          )}
        </button>

        <button
          onClick={() => handlePlaceBet(9)}
          className="relative px-5 py-2.5 rounded-2xl bg-white text-neutral-900 border-3 border-amber-400 font-extrabold text-[14px] shadow-[0_5px_0_#b8860b] active:scale-95 transition flex items-center gap-1.5"
        >
          <span>🍕 পিজা x4</span>
          {bets[9] > 0 && (
            <span className="absolute -top-2.5 -right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white">
              {fmt(bets[9])}
            </span>
          )}
        </button>
      </div>

      {/* Status banner */}
      <div className="h-6 text-center text-[13px] font-bold text-amber-300">
        {statusMessage}
      </div>

      {/* Recent History icons */}
      <div className="flex items-center justify-center gap-1.5 bg-black/30 border border-white/10 rounded-full px-3 py-1.5 w-fit mx-auto my-1 shadow">
        <span className="text-[11px] font-semibold text-white/50 mr-1">ইতিহাস:</span>
        {recentHistory.map((idx, i) => (
          <span
            key={i}
            className="w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-[16px] shadow-sm"
          >
            {ITEMS[idx][0]}
          </span>
        ))}
      </div>

      {/* Chip Selectors */}
      <div className="flex justify-center gap-2.5 my-2">
        {CHIPS.map((chipVal) => {
          const isSelected = selectedChip === chipVal;
          return (
            <button
              key={chipVal}
              onClick={() => setSelectedChip(chipVal)}
              className={`w-14 h-14 rounded-full font-black text-[13px] flex items-center justify-center border-3 transition-all duration-150 active:scale-95
                ${
                  isSelected
                    ? 'bg-amber-400 text-neutral-900 border-white shadow-[0_4px_0_#b8860b,0_0_15px_#ffb300] -translate-y-1'
                    : 'bg-white/15 text-white border-white/30 shadow-[0_4px_0_rgba(0,0,0,0.3)]'
                }
              `}
            >
              {fmt(chipVal)}
            </button>
          );
        })}
      </div>

      {/* Control Actions Bar */}
      <div className="flex items-center justify-center gap-2 max-w-sm mx-auto px-4 mt-1">
        <button
          onClick={() => setShowHistory(true)}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#207ba5] to-[#0c4a75] border border-white/20 text-white font-bold text-[12px] shadow-[0_4px_0_#052842] active:scale-95 flex items-center justify-center gap-1"
        >
          <History className="w-4 h-4" /> হিস্ট্রি
        </button>

        <button
          onClick={() => setShowRanking(true)}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#207ba5] to-[#0c4a75] border border-white/20 text-white font-bold text-[12px] shadow-[0_4px_0_#052842] active:scale-95 flex items-center justify-center gap-1"
        >
          <Trophy className="w-4 h-4 text-amber-300" /> র‍্যাঙ্কিং
        </button>

        <button
          onClick={() => setAutoPlay((prev) => !prev)}
          className={`px-3 py-2.5 rounded-xl font-bold text-[12px] border border-white/20 shadow active:scale-95 transition flex items-center gap-1 ${
            autoPlay ? 'bg-emerald-600 text-white shadow-[0_4px_0_#0a5a14]' : 'bg-white/15 text-white/80'
          }`}
        >
          {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {autoPlay ? 'অটো চালু' : 'অটো'}
        </button>

        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center active:scale-95"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Today Win footer */}
      <div className="text-center text-[12px] font-bold text-white/70 mt-2">
        আজকের মোট জয়: <span className="text-amber-300 font-extrabold">🪙 {profile.todayWon.toLocaleString()}</span>
      </div>

      {/* WIN POPUP */}
      {winPopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#ffd23f] to-[#ff8a00] text-[#3a1500] border-4 border-white rounded-3xl p-6 text-center shadow-[0_0_50px_#ffb300] animate-bounce">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-amber-300 mx-auto flex items-center justify-center text-[42px] mb-2 shadow">
              {winPopup.item}
            </div>
            <h3 className="font-black text-[22px] leading-tight">🎉 সিংহ জয়ী!</h3>
            <p className="font-bold text-[14px] mt-0.5">{profile.displayName}</p>
            <div className="text-[28px] font-black text-[#521c00] mt-2">
              🪙 {winPopup.amount.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showRules && <GameRulesModal gameType="lion_food" onClose={() => setShowRules(false)} />}
      {showHistory && <GameHistoryModal gameType="lion_food" gameTitle="সিংহ ফুড হুইল" onClose={() => setShowHistory(false)} />}
      {showRanking && <GameRankingModal gameTitle="সিংহ ফুড হুইল" onClose={() => setShowRanking(false)} />}
    </div>
  );
};
