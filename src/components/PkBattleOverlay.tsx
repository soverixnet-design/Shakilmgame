import React, { useState, useEffect } from 'react';
import { Swords, Flame, Trophy, Gift, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';

interface PkBattleOverlayProps {
  hostUser: { displayName: string; avatarUrl: string };
  challengerUser: { displayName: string; avatarUrl: string };
  onClose: () => void;
  onSendPkGift: (side: 'blue' | 'red') => void;
}

export const PkBattleOverlay: React.FC<PkBattleOverlayProps> = ({
  hostUser,
  challengerUser,
  onClose,
  onSendPkGift,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes
  const [blueScore, setBlueScore] = useState<number>(12500);
  const [redScore, setRedScore] = useState<number>(11200);
  const [winner, setWinner] = useState<'blue' | 'red' | 'draw' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Determine winner
          if (blueScore > redScore) setWinner('blue');
          else if (redScore > blueScore) setWinner('red');
          else setWinner('draw');
          sound.winFanfare();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [blueScore, redScore]);

  // Periodic random gift simulation to keep PK lively
  useEffect(() => {
    const simTimer = setInterval(() => {
      if (timeLeft > 0 && Math.random() > 0.5) {
        if (Math.random() > 0.5) {
          setBlueScore((s) => s + Math.floor(Math.random() * 500 + 100));
        } else {
          setRedScore((s) => s + Math.floor(Math.random() * 500 + 100));
        }
      }
    }, 2500);
    return () => clearInterval(simTimer);
  }, [timeLeft]);

  const totalScore = blueScore + redScore;
  const bluePercent = totalScore > 0 ? Math.round((blueScore / totalScore) * 100) : 50;
  const redPercent = 100 - bluePercent;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="w-full bg-gradient-to-r from-blue-950/90 via-purple-950/90 to-red-950/90 border-y-2 border-amber-400 p-3 shadow-2xl relative select-none animate-in">
      {/* Top PK Timer Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-blue-400 font-extrabold text-[12px]">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>ব্লু কর্নার ({bluePercent}%)</span>
        </div>

        <div className="bg-black/60 border border-amber-400/60 px-3 py-0.5 rounded-full flex items-center gap-1.5 font-mono text-[13px] font-black text-amber-300">
          <Swords className="w-4 h-4 text-orange-400 animate-spin" />
          <span>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-red-400 font-extrabold text-[12px]">
          <span>রেড কর্নার ({redPercent}%)</span>
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <button onClick={onClose} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/60 ml-1">
            ✕
          </button>
        </div>
      </div>

      {/* Tug of war battle bar */}
      <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden flex border border-white/20 my-1.5 shadow-inner">
        <div
          style={{ width: `${bluePercent}%` }}
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-300"
        />
        <div
          style={{ width: `${redPercent}%` }}
          className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300"
        />
      </div>

      {/* Two Corners Combatants */}
      <div className="flex items-center justify-between pt-1">
        {/* Blue Side */}
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border-2 border-cyan-400 flex items-center justify-center text-[24px] shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            {hostUser.avatarUrl}
          </div>
          <div>
            <span className="text-[12px] font-bold block text-white">{hostUser.displayName}</span>
            <span className="text-[11px] font-extrabold text-cyan-300">🪙 {blueScore.toLocaleString()}</span>
          </div>
          <button
            onClick={() => {
              setBlueScore((s) => s + 500);
              onSendPkGift('blue');
            }}
            className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[11px] shadow active:scale-95 ml-1"
          >
            +গিফট দিন
          </button>
        </div>

        <div className="text-[20px] font-black text-amber-300 italic">VS</div>

        {/* Red Side */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="w-12 h-12 rounded-2xl bg-red-600/30 border-2 border-rose-400 flex items-center justify-center text-[24px] shadow-[0_0_15px_rgba(244,63,94,0.5)]">
            {challengerUser.avatarUrl}
          </div>
          <div className="text-right">
            <span className="text-[12px] font-bold block text-white">{challengerUser.displayName}</span>
            <span className="text-[11px] font-extrabold text-rose-300">🪙 {redScore.toLocaleString()}</span>
          </div>
          <button
            onClick={() => {
              setRedScore((s) => s + 500);
              onSendPkGift('red');
            }}
            className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-[11px] shadow active:scale-95 mr-1"
          >
            +গিফট দিন
          </button>
        </div>
      </div>

      {/* Winner Popup when PK completes */}
      {winner && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 z-30 animate-in">
          <Trophy className="w-10 h-10 text-amber-400 animate-bounce mb-1" />
          <h3 className="text-[18px] font-black text-amber-300">
            {winner === 'blue'
              ? `🎉 ${hostUser.displayName} (ব্লু) বিজয়ী!`
              : winner === 'red'
              ? `🎉 ${challengerUser.displayName} (রেড) বিজয়ী!`
              : 'খেলা ড্র হয়েছে!'}
          </h3>
          <p className="text-[12px] text-white/70 mt-1">
            ব্লু: {blueScore.toLocaleString()} বনাম রেড: {redScore.toLocaleString()}
          </p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-[12px]"
          >
            বন্ধ করুন
          </button>
        </div>
      )}
    </div>
  );
};
