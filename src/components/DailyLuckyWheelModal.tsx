import React, { useState } from 'react';
import { X, Sparkles, Coins, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';

interface DailyLuckyWheelModalProps {
  onClose: () => void;
}

const PRIZES = [
  { amount: 500, label: '৫০০ কয়েন', color: '#7C4DFF' },
  { amount: 2500, label: '২,৫০০ কয়েন', color: '#00E5FF' },
  { amount: 1000, label: '১,০০০ কয়েন', color: '#FF7A00' },
  { amount: 10000, label: '১০,০০০ কয়েন', color: '#FFD700' },
  { amount: 1500, label: '১,৫০০ কয়েন', color: '#9B51E0' },
  { amount: 50000, label: '৫০,০০০ জ্যাকপট! 👑', color: '#FF0055' },
  { amount: 2000, label: '২,০০০ কয়েন', color: '#00C853' },
  { amount: 5000, label: '৫,০০০ কয়েন', color: '#FF4081' },
];

export const DailyLuckyWheelModal: React.FC<DailyLuckyWheelModalProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const adjustCoins = (_amount: number, _won?: number) => {};
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonPrize, setWonPrize] = useState<{ amount: number; label: string } | null>(null);
  const [hasFreeSpin, setHasFreeSpin] = useState<boolean>(() => {
    return localStorage.getItem('shakil_lucky_wheel_date') !== new Date().toDateString();
  });

  const spinWheel = () => {
    if (isSpinning) return;
    if (!hasFreeSpin && profile.coins < 5000) {
      alert('ওয়ালেটে কয়েন নেই! ফ্রি স্পিন প্রতিদিন একবার পাওয়া যায়।');
      return;
    }

    if (!hasFreeSpin) {
      adjustCoins(-5000);
    }

    setIsSpinning(true);
    setWonPrize(null);
    sound.spinWheel();

    // Pick random prize index
    const prizeIdx = Math.floor(Math.random() * PRIZES.length);
    const segmentAngle = 360 / PRIZES.length;
    // Add 5 to 8 full rotations
    const extraRotations = 360 * (5 + Math.floor(Math.random() * 3));
    const targetRotation = rotation + extraRotations + (360 - (prizeIdx * segmentAngle + segmentAngle / 2));

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const prize = PRIZES[prizeIdx];
      setWonPrize(prize);
      adjustCoins(prize.amount, prize.amount);
      sound.winFanfare();
      setHasFreeSpin(false);
      localStorage.setItem('shakil_lucky_wheel_date', new Date().toDateString());
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#25124f] to-[#110526] rounded-3xl border-2 border-amber-400 p-5 shadow-[0_0_50px_rgba(255,184,0,0.3)] text-white text-center relative overflow-hidden animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-2">
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-widest inline-block mb-1">
            {hasFreeSpin ? '🎁 আজকের ফ্রি স্পিন' : '⭐ লাকি রিওয়ার্ড হুইল'}
          </span>
          <h3 className="text-[20px] font-black text-white leading-tight">
            ডেমো লাকি স্পিন 🎡
          </h3>
          <p className="text-[11px] text-white/60">
            শুধু ডেমো; ওয়ালেটে কয়েন যোগ হবে না।
          </p>
        </div>

        {/* Wheel Arena */}
        <div className="relative w-64 h-64 mx-auto my-3 flex items-center justify-center">
          {/* Top Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 z-30 filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400" />
          </div>

          {/* Rotating Wheel Container */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
            }}
            className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_30px_rgba(255,184,0,0.4)] relative overflow-hidden bg-gradient-to-tr from-purple-900 to-indigo-900"
          >
            {PRIZES.map((prize, idx) => {
              const angle = (360 / PRIZES.length) * idx;
              return (
                <div
                  key={idx}
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '50% 100%',
                  }}
                  className="absolute top-0 left-1/2 -ml-12 w-24 h-32 flex flex-col items-center pt-2 select-none"
                >
                  <span className="text-[10px] font-black leading-tight text-white drop-shadow">
                    {prize.amount >= 1000 ? `${prize.amount / 1000}K` : prize.amount}
                  </span>
                  <span className="text-[12px]">🪙</span>
                </div>
              );
            })}
          </div>

          {/* Center Hub */}
          <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border-3 border-white shadow-xl flex items-center justify-center text-[18px] z-20 pointer-events-none">
            ⭐
          </div>
        </div>

        {/* Prize Notification */}
        {wonPrize && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[14px] p-2.5 rounded-xl animate-bounce my-2">
            🎉 জিতেছেন {wonPrize.label}!
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={spinWheel}
          disabled={isSpinning}
          className={`w-full py-3 rounded-2xl font-black text-[14px] shadow-lg active:scale-95 transition ${
            isSpinning
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : hasFreeSpin
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_4px_20px_rgba(251,191,36,0.4)]'
              : 'bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white'
          }`}
        >
          {isSpinning
            ? 'চাকা ঘুরছে...'
            : hasFreeSpin
            ? 'ফ্রি স্পিন করুন 🎁'
            : '৫,০০০ কয়েন দিয়ে স্পিন 🎲'}
        </button>
      </div>
    </div>
  );
};
