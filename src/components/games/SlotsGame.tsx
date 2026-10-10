import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Menu, History, Trophy, HelpCircle, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../utils/sound';
import { GameRulesModal } from './GameRulesModal';
import { GameHistoryModal } from './GameHistoryModal';
import { GameRankingModal } from './GameRankingModal';

type SlotSymbol = '7' | 'B3' | 'B2' | 'B1' | 'BL' | 'GR' | 'OR' | 'CH';

const SYMBOL_KEYS: SlotSymbol[] = ['7', 'B3', 'B2', 'B1', 'BL', 'GR', 'OR', 'CH'];
const SYMBOL_WEIGHTS: Record<SlotSymbol, number> = {
  '7': 2,
  'B3': 3,
  'B2': 4,
  'B1': 6,
  'BL': 10,
  'GR': 22,
  'OR': 34,
  'CH': 50,
};
const TOTAL_WEIGHT = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);

const PAYOUTS_3: Record<SlotSymbol, number> = {
  '7': 70,
  'B3': 20,
  'B2': 15,
  'B1': 12,
  'BL': 10,
  'GR': 7,
  'OR': 6,
  'CH': 5,
};
const PAYOUTS_2: Record<SlotSymbol, number> = {
  '7': 6,
  'B3': 5,
  'B2': 4,
  'B1': 3.5,
  'BL': 3,
  'GR': 3,
  'OR': 3,
  'CH': 2.5,
};
const MIXED_BAR_PAYOUT = 4.5;
const BARS = ['B3', 'B2', 'B1'];

const BET_TIERS = [100, 500, 1000, 5000, 10000, 50000, 100000];

interface SlotsGameProps {
  onBack: () => void;
}

export const SlotsGame: React.FC<SlotsGameProps> = ({ onBack }) => {
  const { profile, adjustCoins, saveGameRound, addDemoCoins } = useAuth();
  const [betIdx, setBetIdx] = useState<number>(2); // default 1000
  const [reels, setReels] = useState<SlotSymbol[][]>([
    ['CH', '7', 'BL'],
    ['OR', 'CH', 'GR'],
    ['B1', 'B2', 'CH'],
  ]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>('SPIN চাপুন অথবা অটো চালু করুন 🎰');
  const [winAnimation, setWinAnimation] = useState<{ amount: number; multiplier: number } | null>(null);
  const [todayWonLocal, setTodayWonLocal] = useState<number>(0);
  const [winningReelIndices, setWinningReelIndices] = useState<number[]>([]);

  // Modals
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showRanking, setShowRanking] = useState<boolean>(false);

  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentBet = BET_TIERS[betIdx];

  const pickSymbol = (): SlotSymbol => {
    let rand = Math.random() * TOTAL_WEIGHT;
    for (const key of SYMBOL_KEYS) {
      if ((rand -= SYMBOL_WEIGHTS[key]) < 0) return key;
    }
    return 'CH';
  };

  const evaluateSpin = (r: SlotSymbol[]) => {
    // 3 of a kind
    if (r[0] === r[1] && r[1] === r[2]) {
      return { multiplier: PAYOUTS_3[r[0]], count: 3, name: r[0] };
    }
    // Mixed bars
    if (r.every((sym) => BARS.includes(sym))) {
      return { multiplier: MIXED_BAR_PAYOUT, count: 3, name: 'MIX_BAR' };
    }
    // 2 of a kind from left
    if (r[0] === r[1]) {
      return { multiplier: PAYOUTS_2[r[0]], count: 2, name: r[0] };
    }
    return { multiplier: 0, count: 0, name: '' };
  };

  const spin = () => {
    if (isSpinning) return;
    if (profile.coins < currentBet) {
      setStatusMsg('কয়েন পর্যাপ্ত নয়! কয়েন যোগ করুন +');
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setWinningReelIndices([]);
    setWinAnimation(null);
    adjustCoins(-currentBet);
    sound.spinWheel();

    const resultSymbols: [SlotSymbol, SlotSymbol, SlotSymbol] = [
      pickSymbol(),
      pickSymbol(),
      pickSymbol(),
    ];

    // Reel spin animation duration
    const spinDuration = fastMode ? 600 : 1200;

    // Simulate animated reels cycle
    const interval = setInterval(() => {
      setReels([
        [pickSymbol(), pickSymbol(), pickSymbol()],
        [pickSymbol(), pickSymbol(), pickSymbol()],
        [pickSymbol(), pickSymbol(), pickSymbol()],
      ]);
      sound.tick();
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      // Set the middle payline symbols to resultSymbols
      setReels([
        [pickSymbol(), resultSymbols[0], pickSymbol()],
        [pickSymbol(), resultSymbols[1], pickSymbol()],
        [pickSymbol(), resultSymbols[2], pickSymbol()],
      ]);

      handleSpinEnd(resultSymbols, currentBet);
    }, spinDuration);
  };

  const handleSpinEnd = (result: SlotSymbol[], bet: number) => {
    setIsSpinning(false);
    const evalResult = evaluateSpin(result);
    const winAmount = Math.round(evalResult.multiplier * bet);

    if (winAmount > 0) {
      sound.winFanfare();
      setWinAnimation({ amount: winAmount, multiplier: evalResult.multiplier });
      setWinningReelIndices(evalResult.count === 3 ? [0, 1, 2] : [0, 1]);
      adjustCoins(winAmount, winAmount);
      setTodayWonLocal((w) => w + winAmount);
      setStatusMsg(`🎉 পে-লাইন মিলেছে! +🪙 ${winAmount.toLocaleString()}`);
    } else {
      setStatusMsg('এবার মেলেনি, আবার চেষ্টা করুন!');
    }

    // Save record
    saveGameRound({
      gameType: 'slots',
      roundNumber: Math.floor(Math.random() * 1000) + 100,
      result: result.join(' - '),
      betAmount: bet,
      winAmount: winAmount,
    });

    if (autoSpinRef.current) {
      setTimeout(spin, winAmount > 0 ? 1600 : 600);
    }
  };

  const renderSymbolVisual = (sym: SlotSymbol, scale: string = 'text-[28px]') => {
    switch (sym) {
      case '7':
        return <span className={`font-black font-serif italic text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${scale}`}>7️⃣</span>;
      case 'B3':
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-600 text-[10px] font-black px-1.5 py-0.2 rounded border border-white/60">BAR</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-600 text-[10px] font-black px-1.5 py-0.2 rounded border border-white/60">BAR</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-600 text-[10px] font-black px-1.5 py-0.2 rounded border border-white/60">BAR</span>
          </div>
        );
      case 'B2':
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <span className="bg-gradient-to-r from-emerald-400 to-green-600 text-[10px] font-black px-1.5 py-0.2 rounded border border-white/60">BAR</span>
            <span className="bg-gradient-to-r from-emerald-400 to-green-600 text-[10px] font-black px-1.5 py-0.2 rounded border border-white/60">BAR</span>
          </div>
        );
      case 'B1':
        return (
          <span className="bg-gradient-to-r from-fuchsia-400 to-purple-600 text-[11px] font-black px-2 py-0.5 rounded border border-white/60">
            BAR
          </span>
        );
      case 'BL':
        return <span className={scale}>🔔</span>;
      case 'GR':
        return <span className={scale}>🍇</span>;
      case 'OR':
        return <span className={scale}>🍊</span>;
      case 'CH':
        return <span className={scale}>🍒</span>;
    }
  };

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#251052] via-[#12072e] to-[#080218] text-white flex flex-col justify-between pb-6 select-none relative overflow-x-hidden">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto px-4 py-2.5 flex items-center justify-between border-b border-indigo-500/20 bg-indigo-950/40">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-cyan-300">No.10101</span>
          <span className="text-[11px] bg-emerald-900/60 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
            📶 114ms
          </span>
        </div>

        <button
          onClick={() => setShowMenu((m) => !m)}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-4 top-14 z-50 w-52 bg-gradient-to-b from-[#2a1c66] to-[#160c38] border-2 border-indigo-400 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-2 text-[13px] font-bold space-y-1">
          <button
            onClick={() => {
              setSoundOn((s) => !s);
              sound.enabled = !soundOn;
            }}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between hover:bg-white/10"
          >
            <span>🔊 SOUND</span>
            <span className={soundOn ? 'text-emerald-400' : 'text-white/40'}>{soundOn ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              setShowRules(true);
            }}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between hover:bg-white/10 text-left"
          >
            <span>📖 নিয়ম (Rules)</span>
            <span>➔</span>
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              setShowHistory(true);
            }}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between hover:bg-white/10 text-left"
          >
            <span>📜 হিস্ট্রি</span>
            <span>➔</span>
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              setShowRanking(true);
            }}
            className="w-full px-3 py-2 rounded-lg flex items-center justify-between hover:bg-white/10 text-left"
          >
            <span>🏆 র‍্যাঙ্কিং</span>
            <span>➔</span>
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="text-center pt-2 pb-1 relative">
        <h1 className="text-[44px] font-black tracking-wider leading-none bg-gradient-to-b from-[#fff6a0] via-[#f5b50a] to-[#b86a00] bg-clip-text text-transparent filter drop-shadow-[0_4px_0_#6b2f00]">
          SLOTS
        </h1>
        <p className="text-[14px] italic font-serif text-cyan-300 font-bold -mt-1">
          Bonus Pile Up!
        </p>
      </div>

      {/* Mini Paytable Strip */}
      <div className="w-[92%] max-w-sm mx-auto grid grid-cols-4 gap-1 p-2 bg-gradient-to-b from-amber-500/80 to-amber-700/80 rounded-t-xl border border-amber-300 text-[10px] font-extrabold text-center shadow-md">
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>777</span><span className="text-amber-300">x70</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>BAR³</span><span className="text-amber-300">x20</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>BAR²</span><span className="text-amber-300">x15</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>BAR</span><span className="text-amber-300">x12</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>🔔🔔🔔</span><span className="text-amber-300">x10</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>🍇🍇🍇</span><span className="text-amber-300">x7</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>🍊🍊🍊</span><span className="text-amber-300">x6</span>
        </div>
        <div className="bg-black/60 rounded p-1 flex justify-between items-center px-1.5">
          <span>🍒🍒🍒</span><span className="text-amber-300">x5</span>
        </div>
      </div>

      {/* Slot Machine Frame & Reels */}
      <div className="w-[92%] max-w-sm mx-auto relative p-3 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 border-2 border-amber-300 rounded-b-2xl shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
        {/* Lights along frame */}
        <div className="flex justify-between px-2 mb-1">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-cyan-300" />
            <span className="w-2 h-2 rounded-full bg-pink-400" />
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            <span className="w-2 h-2 rounded-full bg-cyan-300" />
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
          </div>
        </div>

        {/* 3 Physical Reels Container */}
        <div className="relative bg-[#d8d8ea] border-4 border-[#7b54d6] rounded-xl overflow-hidden shadow-inner flex h-[216px]">
          {/* Active Center Golden Payline */}
          <div className="absolute left-0 right-0 top-[72px] h-[72px] border-t-3 border-b-3 border-amber-400 pointer-events-none z-20 shadow-[0_0_12px_#ffd84a] bg-amber-400/10 flex items-center justify-between px-1">
            <span className="text-[12px] font-black text-amber-300">▶</span>
            <span className="text-[12px] font-black text-amber-300">◀</span>
          </div>

          {/* 3 Columns */}
          {[0, 1, 2].map((colIdx) => {
            const isHit = winningReelIndices.includes(colIdx);
            return (
              <div
                key={colIdx}
                className={`flex-1 flex flex-col justify-between border-r last:border-r-0 border-black/20 ${
                  isHit ? 'bg-amber-200/40' : ''
                }`}
              >
                {/* 3 rows per column: Top, Center (Payline), Bottom */}
                {[0, 1, 2].map((rowIdx) => {
                  const sym = reels[colIdx]?.[rowIdx] || 'CH';
                  const isPaylineRow = rowIdx === 1;

                  return (
                    <div
                      key={rowIdx}
                      className={`h-[72px] flex items-center justify-center transition-all ${
                        isPaylineRow && isHit ? 'scale-110 drop-shadow-[0_0_10px_#ffd23f]' : ''
                      }`}
                    >
                      {renderSymbolVisual(sym, isPaylineRow ? 'text-[36px]' : 'text-[24px] opacity-70')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status banner */}
      <div className="h-6 text-center text-[13px] font-bold text-amber-300 mt-2">
        {statusMsg}
      </div>

      {/* Control Panel Grid */}
      <div className="w-[94%] max-w-sm mx-auto bg-gradient-to-r from-[#2a4ab8] via-[#1e2e80] to-[#2a1a8a] border-2 border-indigo-400 rounded-3xl p-3 shadow-xl grid grid-cols-[64px_1fr_88px] gap-2 items-center my-2">
        {/* User Balance */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border-2 border-indigo-300 flex items-center justify-center text-[22px] shadow">
            {profile.avatarUrl}
          </div>
          <div className="text-[11px] font-extrabold text-amber-300 truncate max-w-[64px] mt-1 text-center">
            🪙 {profile.coins >= 1000000 ? (profile.coins / 1000000).toFixed(1) + 'M' : profile.coins.toLocaleString()}
          </div>
        </div>

        {/* Center: Bet Selector & Fast Mode */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-bold text-cyan-200">
            আজকের জয়: 🪙 {todayWonLocal.toLocaleString()}
          </span>

          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={() => {
                setBetIdx((i) => Math.max(0, i - 1));
                sound.tick();
              }}
              className="w-8 h-8 rounded-lg bg-black/40 border border-white/20 font-black text-[18px] flex items-center justify-center active:scale-90"
            >
              −
            </button>
            <div className="flex-1 bg-black/60 border border-white/20 rounded-lg py-1 text-center font-black text-[15px] text-amber-300 shadow-inner">
              🪙 {currentBet.toLocaleString()}
            </div>
            <button
              onClick={() => {
                setBetIdx((i) => Math.min(BET_TIERS.length - 1, i + 1));
                sound.tick();
              }}
              className="w-8 h-8 rounded-lg bg-black/40 border border-white/20 font-black text-[18px] flex items-center justify-center active:scale-90"
            >
              +
            </button>
            <button
              onClick={() => setFastMode((f) => !f)}
              className={`w-9 h-8 rounded-lg text-[10px] font-black border flex flex-col items-center justify-center active:scale-90 transition ${
                fastMode ? 'bg-amber-400 text-black border-white' : 'bg-white/10 text-white/70 border-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fast</span>
            </button>
          </div>
        </div>

        {/* Big SPIN / AUTO Button */}
        <button
          onClick={() => {
            if (autoSpin) {
              setAutoSpin(false);
              return;
            }
            spin();
          }}
          onMouseDown={() => {
            holdTimerRef.current = setTimeout(() => {
              setAutoSpin((a) => !a);
              setStatusMsg(autoSpin ? 'অটো স্পিন বন্ধ' : 'অটো স্পিন চালু ▶');
            }, 550);
          }}
          onMouseUp={() => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          }}
          onTouchStart={() => {
            holdTimerRef.current = setTimeout(() => {
              setAutoSpin((a) => !a);
              setStatusMsg(autoSpin ? 'অটো স্পিন বন্ধ' : 'অটো স্পিন চালু ▶');
            }, 550);
          }}
          onTouchEnd={() => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          }}
          disabled={isSpinning && !autoSpin}
          className={`w-20 h-20 rounded-full font-black text-[18px] leading-tight border-4 shadow-xl active:scale-95 transition flex flex-col items-center justify-center ${
            autoSpin
              ? 'bg-gradient-to-br from-amber-500 to-rose-600 border-amber-200 text-white shadow-[0_0_25px_#f97316]'
              : 'bg-gradient-to-br from-[#8aff6a] to-[#1a9a1a] border-emerald-200 text-white shadow-[0_6px_0_#0a5a14,0_0_20px_#22c55e]'
          }`}
        >
          <span>{autoSpin ? 'AUTO' : 'SPIN'}</span>
          <span className="text-[8px] font-semibold text-white/80 block -mt-0.5">
            {autoSpin ? 'চাপলে বন্ধ' : 'HOLD AUTO'}
          </span>
        </button>
      </div>

      {/* Win Banner Popup */}
      {winAnimation && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-900 border-2 border-white rounded-full px-6 py-2 shadow-[0_0_40px_#ffb300] flex items-center gap-3 animate-bounce">
          <span className="text-[28px]">🎉</span>
          <div>
            <span className="text-[12px] font-bold block uppercase tracking-wider">Big Win ({winAnimation.multiplier}x)</span>
            <span className="text-[20px] font-black block leading-none">🪙 +{winAnimation.amount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRules && <GameRulesModal gameType="slots" onClose={() => setShowRules(false)} />}
      {showHistory && <GameHistoryModal gameType="slots" gameTitle="স্লটস গেম" onClose={() => setShowHistory(false)} />}
      {showRanking && <GameRankingModal gameTitle="স্লটস গেম" onClose={() => setShowRanking(false)} />}
    </div>
  );
};
