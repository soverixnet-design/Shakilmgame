import React, { useState } from 'react';
import { X, Sparkles, Check, Crown, Flame, Gem } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/sound';

export interface VipFrame {
  id: string;
  name: string;
  borderClass: string;
  glowClass: string;
  badge: string;
  price: number;
}

export const VIP_FRAMES: VipFrame[] = [
  {
    id: 'default',
    name: 'ডিফল্ট ফ্রেম',
    borderClass: 'border-white/20',
    glowClass: '',
    badge: 'Standard',
    price: 0,
  },
  {
    id: 'gold',
    name: 'গোল্ডেন রয়্যাল ক্রাউন 👑',
    borderClass: 'border-amber-400 ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_20px_rgba(255,215,0,0.6)]',
    badge: 'Royalty VIP',
    price: 50000,
  },
  {
    id: 'cyber',
    name: 'সাইবার নিয়ন সায়ান ⚡',
    borderClass: 'border-[#00E5FF] ring-2 ring-[#00E5FF] ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_25px_rgba(0,229,255,0.7)]',
    badge: 'Cyber Pro',
    price: 75000,
  },
  {
    id: 'flame',
    name: 'রুবি ফায়ার ফ্লেম 🔥',
    borderClass: 'border-orange-500 ring-2 ring-rose-500 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_25px_rgba(249,115,22,0.8)]',
    badge: 'Fire King',
    price: 100000,
  },
  {
    id: 'diamond',
    name: 'ডায়মন্ড লাক্সারি 💎',
    borderClass: 'border-cyan-200 ring-3 ring-cyan-300 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_30px_rgba(165,243,252,0.8)]',
    badge: 'Diamond God',
    price: 250000,
  },
  {
    id: 'svip',
    name: 'রয়্যাল এসভিআইপি উইংস 🦅',
    borderClass: 'border-yellow-300 ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_28px_rgba(255,215,0,0.8)]',
    badge: 'SVIP King',
    price: 300000,
  },
  {
    id: 'angel',
    name: 'ডিভাইন এঞ্জেল উইংস 🪽',
    borderClass: 'border-pink-300 ring-2 ring-purple-400 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_22px_rgba(244,114,182,0.7)]',
    badge: 'Angel Wings',
    price: 150000,
  },
  {
    id: 'dragon',
    name: 'ইম্পেরিয়াল গোল্ড ড্রাগন 🐉',
    borderClass: 'border-emerald-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_25px_rgba(52,211,153,0.7)]',
    badge: 'Dragon Emperor',
    price: 400000,
  },
  {
    id: 'floral',
    name: 'রয়্যাল ফ্লোরাল রিং 🌸',
    borderClass: 'border-rose-400 ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0F0F14]',
    glowClass: 'shadow-[0_0_20px_rgba(251,113,133,0.6)]',
    badge: 'Floral Royalty',
    price: 80000,
  },
];

interface VipFrameModalProps {
  currentFrameId: string;
  onSelectFrame: (frameId: string) => void;
  onClose: () => void;
}

export const VipFrameModal: React.FC<VipFrameModalProps> = ({
  currentFrameId,
  onSelectFrame,
  onClose,
}) => {
  const { profile, adjustCoins } = useAuth();
  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('unlocked_vip_frames');
      return saved ? JSON.parse(saved) : ['default', 'gold'];
    } catch {
      return ['default', 'gold'];
    }
  });

  const handleApplyOrBuy = (frame: VipFrame) => {
    if (unlockedFrames.includes(frame.id)) {
      onSelectFrame(frame.id);
      sound.winFanfare();
      onClose();
      return;
    }

    if (profile.coins < frame.price) {
      alert('ওয়ালেটে পর্যাপ্ত কয়েন নেই! গেমস খেলে কয়েন জিতুন বা রিচার্জ করুন।');
      return;
    }

    adjustCoins(-frame.price);
    const next = [...unlockedFrames, frame.id];
    setUnlockedFrames(next);
    localStorage.setItem('unlocked_vip_frames', JSON.stringify(next));
    onSelectFrame(frame.id);
    sound.winFanfare();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#21144a] to-[#0f0724] rounded-3xl border-2 border-amber-400 p-5 shadow-2xl text-white animate-in">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-[16px] text-amber-300">
              ভিআইপি ফ্রেম স্টোর 👑
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 my-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-hide">
          {VIP_FRAMES.map((frame) => {
            const isUnlocked = unlockedFrames.includes(frame.id);
            const isCurrent = currentFrameId === frame.id;

            return (
              <div
                key={frame.id}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                  isCurrent
                    ? 'bg-[#7C4DFF]/25 border-amber-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[24px] bg-[#1a1136] ${frame.borderClass} ${frame.glowClass}`}
                  >
                    {profile.avatarUrl}
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px] text-white leading-tight">
                      {frame.name}
                    </h4>
                    <span className="text-[10px] text-amber-300 font-extrabold">
                      {frame.badge}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyOrBuy(frame)}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-[11px] transition active:scale-95 ${
                    isCurrent
                      ? 'bg-emerald-500 text-black cursor-default'
                      : isUnlocked
                      ? 'bg-[#7C4DFF] text-white shadow'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow'
                  }`}
                >
                  {isCurrent ? 'একটিভ ✓' : isUnlocked ? 'ব্যবহার' : `🪙 ${frame.price.toLocaleString()}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
