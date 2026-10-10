import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Pause, History, Trophy, HelpCircle, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../utils/sound';
import { GameRulesModal } from './GameRulesModal';
import { GameHistoryModal } from './GameHistoryModal';
import { GameRankingModal } from './GameRankingModal';

// 9 tiles in a 3x3 grid (center is the timer)
// Indices:
// 0: 🍋 x5    1: 🍇 x5    2: 🥝 x5
// 3: 🍒 x40   4: [TIMER]   5: 🍑 x5
// 6: 🍉 x20   7: 🍌 x10   8: 🍓 x10
// Ring traversal order: [0, 1, 2, 5, 8, 7, 6, 3]
const RING_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];

const FRUITS: ([string, number, string] | null)[] = [
  ['🍋', 5, 'লেবু'],
  ['🍇', 5, 'আঙুর'],
  ['🥝', 5, 'কিউই'],
  ['🍒', 40, 'চেরি'],
  null, // center
  ['🍑', 5, 'পীচ'],
  ['🍉', 20, 'তরমুজ'],
  ['🍌', 10, 'কলা'],
  ['🍓', 10, 'স্ট্রবেরি'],
];

const CHIPS = [10000, 100000, 500000, 1000000];

interface JackpotFruitProps {
  onBack: () => void;
}

export const JackpotFruit: React.FC<JackpotFruitProps> = ({ onBack }) => {
  const { profile, adjustCoins, saveGameRound, addDemoCoins } = useAuth();
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[0]);
  const [bets, setBets] = useState<number[]>(Array(9).fill(0));
  const [lastBets, setLastBets] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<'bet' | 'spin'>('bet');
  const [countdown, setCountdown] = useState<number>(20);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [bonusReel, setBonusReel] = useState<string[]>(['+1', '+2', 'x2']);
  const [bonusActiveIdx, setBonusActiveIdx] = useState<number | null>(null);
  const [jackpotPool, setJackpotPool] = useState<number>(21845900);
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    return 1500 + Math.floor(Math.random() * 30);
  });
  const [recentHistory, setRecentHistory] = useState<number[]>([3, 6, 0, 8, 7]);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [roundResultModal, setRoundResultModal] = useState<{
    items: string[];
    bonus: string;
    win: number;
    cost: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('বেট ধরুন 🎰 জ্যাকপট ও বোনাস অপেক্ষা করছে');

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

  // Slowly increment jackpot pool to simulate active network
  useEffect(() => {
    const jpTimer = setInterval(() => {
      setJackpotPool((prev) => prev + Math.floor(Math.random() * 80 + 20));
    }, 2000);
    return () => clearInterval(jpTimer);
  }, []);

  // Countdown
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

  const pickFruit = (): number => {
    const multipliers = RING_ORDER.map((idx) => 1 / (FRUITS[idx]?.[1] || 5));
    const total = multipliers.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < RING_ORDER.length; i++) {
      if ((rand -= multipliers[i]) < 0) {
        return RING_ORDER[i];
      }
    }
    return RING_ORDER[0];
  };

  const pickBonus = (): string => {
    const r = Math.random();
    if (r < 0.88) return ''; // no bonus
    if (r < 0.93) return '+1';
    if (r < 0.96) return '+2';
    if (r < 0.985) return 'x2';
    if (r < 0.995) return 'x3';
    return 'JP';
  };

  const triggerSpin = () => {
    setPhase('spin');
    setStatusMessage('ফল ঘুরছে... জ্যাকপট ও বোনাস নির্ধারণ হচ্ছে 🎰');

    const cost = betsRef.current.reduce((a, b) => a + b, 0);
    const winIdx = pickFruit();
    const bonus = pickBonus();

    let ringPos = Math.floor(Math.random() * 8);
    const targetRingPos = RING_ORDER.indexOf(winIdx);
    let stepsRemaining = 24 + ((targetRingPos - ringPos + 8) % 8);

    const spinInterval = setInterval(() => {
      ringPos = (ringPos + 1) % 8;
      setHighlightIdx(RING_ORDER[ringPos]);
      sound.tick();
      stepsRemaining--;

      if (stepsRemaining <= 0) {
        clearInterval(spinInterval);
        animateBonusReel(winIdx, bonus, cost);
      }
    }, 85);
  };

  const animateBonusReel = (winIdx: number, bonus: string, cost: number) => {
    // Mini bonus reel animation
    let count = 0;
    const bonusInterval = setInterval(() => {
      setBonusActiveIdx(count % 3);
      count++;
      if (count > 9) {
        clearInterval(bonusInterval);
        setBonusActiveIdx(null);

        // Highlight bonus if hit
        if (bonus === '+1') setBonusActiveIdx(0);
        else if (bonus === '+2') setBonusActiveIdx(1);
        else if (bonus === 'x2' || bonus === 'x3') {
          setBonusActiveIdx(2);
          setBonusReel(['+1', '+2', bonus]);
        } else if (bonus === 'JP') {
          setBonusActiveIdx(2);
        }

        handleSpinEnd(winIdx, bonus, cost);
      }
    }, 110);
  };

  const handleSpinEnd = (winIdx: number, bonus: string, cost: number) => {
    const currentBets = betsRef.current;
    setLastBets([...currentBets]);

    const results = [winIdx];
    if (bonus === '+1') results.push(pickFruit());
    if (bonus === '+2') {
      results.push(pickFruit(), pickFruit());
    }

    const multiplier = bonus === 'x2' ? 2 : bonus === 'x3' ? 3 : 1;
    let totalWin = results.reduce((sum, r) => sum + currentBets[r] * (FRUITS[r]?.[1] || 0), 0) * multiplier;

    // Jackpot bonus payout
    if (bonus === 'JP' && cost >= 1000) {
      sound.bigJackpot();
      const jpShare = Math.floor(jackpotPool * 0.3); // 30% jackpot
      setJackpotPool((prev) => Math.max(10000000, prev - jpShare));
      totalWin += jpShare;
    }

    // Save history
    results.forEach((r) => setRecentHistory((prev) => [r, ...prev.slice(0, 6)]));
    setRoundNumber((r) => r + 1);

    if (totalWin > 0) {
      sound.winFanfare();
      adjustCoins(totalWin, totalWin);
      setStatusMessage(`🎉 অভিনন্দন! জিতেছেন 🪙 ${totalWin.toLocaleString()}!`);
    } else {
      setStatusMessage(cost > 0 ? 'এবার লাগেনি 😅 আবার চেষ্টা করুন' : 'রাউন্ড সম্পন্ন');
    }

    // Show round results modal with top 3 winners
    setRoundResultModal({
      items: results.map((r) => FRUITS[r]?.[0] || '🍋'),
      bonus,
      win: totalWin,
      cost,
    });

    if (cost > 0) {
      saveGameRound({
        gameType: 'jackpot_fruit',
        roundNumber: roundNumber,
        result: results.map((r) => FRUITS[r]?.[0]).join(' '),
        betAmount: cost,
        winAmount: totalWin,
      });
    }

    setTimeout(() => {
      setRoundResultModal(null);
      setHighlightIdx(null);
      setBonusActiveIdx(null);
      setBonusReel(['+1', '+2', 'x2']);
      setBets(Array(9).fill(0));
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
    }, 3800);
  };

  const handlePlaceBet = (idx: number) => {
    if (idx === 4 || phase !== 'bet') return;
    if (profile.coins < selectedChip) {
      setStatusMessage('ওয়ালেটে পর্যাপ্ত কয়েন নেই! কয়েন যোগ করুন +');
      return;
    }

    adjustCoins(-selectedChip);
    sound.betPlace();
    setJackpotPool((jp) => jp + Math.floor(selectedChip * 0.05)); // 5% added to JP pool
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
    <div className="min-h-full w-full bg-gradient-to-b from-[#3d1466] via-[#1c0836] to-[#0a0216] text-white flex flex-col justify-between pb-6 select-none relative overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto px-4 py-2.5 flex items-center justify-between font-bold z-10">
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
            #{roundNumber}
          </span>
          <button
            onClick={() => setShowRules(true)}
            className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* JACKPOT POOL DISPLAY */}
      <div className="text-center my-1 relative">
        <h2 className="text-[32px] font-black tracking-widest leading-none bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_#000]">
          JACKPOT
        </h2>
        <div className="w-[82%] max-w-xs mx-auto bg-gradient-to-r from-red-900 via-purple-950 to-red-900 border-2 border-amber-400 rounded-xl py-1 px-3 shadow-[0_0_20px_rgba(255,180,0,0.4)] flex items-center justify-center gap-2 mt-1">
          <span className="text-[18px]">🪙</span>
          <span className="text-[20px] font-black text-amber-300 tracking-wider font-mono">
            {jackpotPool.toLocaleString()}
          </span>
          <span className="text-[18px]">🪙</span>
        </div>
      </div>

      {/* Mini Bonus Slot Reel */}
      <div className="w-[65%] max-w-[240px] mx-auto bg-[#c9c9d8] p-1.5 rounded-xl shadow-[0_6px_0_#5a5a7a] flex gap-2 justify-center my-1">
        {bonusReel.map((bonusTxt, bIdx) => {
          const isActive = bonusActiveIdx === bIdx;
          return (
            <div
              key={bIdx}
              className={`flex-1 h-11 rounded-lg flex items-center justify-center font-black text-[15px] border transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-yellow-300 to-amber-500 text-black border-amber-200 shadow-[0_0_15px_#ffb300] scale-105'
                  : 'bg-gradient-to-b from-white to-[#b0b0cc] text-purple-950 border-white/60'
              }`}
            >
              {bonusTxt}
            </div>
          );
        })}
      </div>

      {/* 3x3 Grid: 8 Fruits + Center Timer */}
      <div className="w-[92%] max-w-[340px] mx-auto bg-gradient-to-b from-[#7048c2] to-[#3f2282] p-2.5 rounded-2xl border border-white/20 shadow-[0_10px_0_#1e0e47] my-1">
        <div className="grid grid-cols-3 gap-2">
          {FRUITS.map((fruit, idx) => {
            if (idx === 4) {
              // Center Timer
              return (
                <div
                  key="timer"
                  className="rounded-xl bg-gradient-to-br from-[#4a0815] to-[#1c0208] border-2 border-dashed border-rose-500 flex flex-col items-center justify-center shadow-inner"
                >
                  <span className="text-[10px] font-extrabold text-rose-300">সময়</span>
                  <span className={`text-[36px] font-black leading-none font-mono text-amber-300 ${countdown <= 5 && phase === 'bet' ? 'text-red-400 animate-ping' : ''}`}>
                    {phase === 'bet' ? countdown.toString().padStart(2, '0') : '--'}
                  </span>
                </div>
              );
            }

            const isHigh = highlightIdx === idx;
            const betVal = bets[idx];
            const isHighMultiplier = idx === 3 || idx === 6; // Cherry x40 or Watermelon x20

            return (
              <button
                key={idx}
                onClick={() => handlePlaceBet(idx)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-md
                  ${
                    isHigh
                      ? 'bg-gradient-to-b from-amber-300 to-yellow-500 text-black border-3 border-white scale-105 shadow-[0_0_25px_#ffd23f] z-10'
                      : isHighMultiplier
                      ? 'bg-gradient-to-b from-[#5a2fb0] to-[#2e1470] text-white border border-purple-400/30'
                      : 'bg-gradient-to-b from-[#1f6a62] to-[#0e3a40] text-white border border-teal-400/30'
                  }
                `}
              >
                <span className="text-[34px] leading-none filter drop-shadow">{fruit?.[0]}</span>
                <span className="text-[11px] font-black mt-1 leading-none">x{fruit?.[1]}</span>

                {betVal > 0 && (
                  <span className="absolute -top-2 -right-1 bg-rose-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full shadow border border-white">
                    {fmt(betVal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status banner */}
      <div className="h-6 text-center text-[13px] font-bold text-amber-300 mt-1">
        {statusMessage}
      </div>

      {/* Recent Results Strip */}
      <div className="flex items-center justify-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-3 py-1.5 w-fit mx-auto my-1 shadow">
        <span className="text-[11px] font-semibold text-white/50 mr-1">ফলাফল:</span>
        {recentHistory.map((idx, i) => (
          <span
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[16px] shadow-sm ${
              i === 0 ? 'bg-amber-400/30 border-2 border-amber-400' : 'bg-white/15 border border-white/20'
            }`}
          >
            {FRUITS[idx]?.[0]}
          </span>
        ))}
      </div>

      {/* Chip Selectors */}
      <div className="flex justify-center gap-2.5 my-1.5">
        {CHIPS.map((chipVal) => {
          const isSelected = selectedChip === chipVal;
          return (
            <button
              key={chipVal}
              onClick={() => setSelectedChip(chipVal)}
              className={`w-14 h-14 rounded-full font-black text-[13px] flex items-center justify-center border-3 transition-all duration-150 active:scale-95
                ${
                  isSelected
                    ? 'bg-rose-500 text-white border-white shadow-[0_4px_0_#9f1239,0_0_15px_#f43f5e] -translate-y-1'
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
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6ae0] to-[#4a2aa0] border border-white/20 text-white font-bold text-[12px] shadow-[0_4px_0_#2a1470] active:scale-95 flex items-center justify-center gap-1"
        >
          <History className="w-4 h-4" /> হিস্ট্রি
        </button>

        <button
          onClick={() => setShowRanking(true)}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6ae0] to-[#4a2aa0] border border-white/20 text-white font-bold text-[12px] shadow-[0_4px_0_#2a1470] active:scale-95 flex items-center justify-center gap-1"
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
      <div className="text-center text-[12px] font-bold text-white/60 mt-2">
        আজকের মোট জয়: <span className="text-amber-300 font-extrabold">🪙 {profile.todayWon.toLocaleString()}</span>
      </div>

      {/* ROUND RESULT MODAL WITH TOP 3 WINNERS */}
      {roundResultModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#3a1b6a] to-[#1a0b38] border-3 border-amber-400 rounded-3xl p-5 text-center shadow-[0_0_50px_#ffb300] animate-in">
            <h3 className="font-extrabold text-[16px] text-amber-300">
              রাউন্ড #{roundNumber - 1} এর ফলাফল
            </h3>

            <div className="text-[48px] my-2 filter drop-shadow">
              {roundResultModal.items.join(' ')}
            </div>

            {roundResultModal.bonus && (
              <p className="text-[13px] font-black text-amber-300 bg-amber-500/20 py-1 px-3 rounded-full border border-amber-400/40 w-fit mx-auto my-1">
                🎁 বোনাস রিওয়ার্ড: {roundResultModal.bonus}
              </p>
            )}

            <div className="bg-black/40 rounded-xl p-3 my-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-white/60">এই রাউন্ডের খরচ:</span>
                <span className="font-bold text-white">🪙 {roundResultModal.cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5">
                <span className="text-amber-300 font-bold">এই রাউন্ডে প্রাপ্তি:</span>
                <span className="font-black text-emerald-400 text-[15px]">🪙 {roundResultModal.win.toLocaleString()}</span>
              </div>
            </div>

            {/* Top 3 Round Winners */}
            <div className="border-t border-white/10 pt-2 text-left">
              <p className="text-[11px] font-bold text-amber-300 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> এই রাউন্ডের শীর্ষ ৩ বিজয়ী:
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1">
                  <span>🥇 Shakil Pro</span>
                  <span className="text-amber-300 font-bold">🪙 2.4M</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1">
                  <span>🥈 {profile.displayName} (আপনি)</span>
                  <span className="text-amber-300 font-bold">🪙 {roundResultModal.win > 0 ? roundResultModal.win.toLocaleString() : '1.2M'}</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1">
                  <span>🥉 Nusrat VIP</span>
                  <span className="text-amber-300 font-bold">🪙 850K</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setRoundResultModal(null)}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-[13px] bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow active:scale-95"
            >
              পরের রাউন্ড খেলুন
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showRules && <GameRulesModal gameType="jackpot_fruit" onClose={() => setShowRules(false)} />}
      {showHistory && <GameHistoryModal gameType="jackpot_fruit" gameTitle="জ্যাকপট ফ্রুট" onClose={() => setShowHistory(false)} />}
      {showRanking && <GameRankingModal gameTitle="জ্যাকপট ফ্রুট" onClose={() => setShowRanking(false)} />}
    </div>
  );
};
