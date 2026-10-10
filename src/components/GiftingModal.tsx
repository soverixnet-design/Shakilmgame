import React, { useState } from 'react';
import { X, Gift, Coins, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/SettingsContext';
import { GiftItem } from '../types';
import { sound } from '../utils/sound';

interface GiftingModalProps {
  targetUser: {
    uid: string;
    displayName: string;
    avatarUrl: string;
  };
  onClose: () => void;
  onGiftSent: (gift: GiftItem, count: number) => void;
}

export const GiftingModal: React.FC<GiftingModalProps> = ({
  targetUser,
  onClose,
  onGiftSent,
}) => {
  const { profile, sendGift, addDemoCoins } = useAuth();
  const { settings } = useAppSettings();
  const giftsList = settings.gifts;
  const [selectedGift, setSelectedGift] = useState<GiftItem>(giftsList[0] || {
    id: 'g1',
    name: 'Golap',
    nameBn: 'গোলাপ',
    emoji: '🌹',
    price: 10,
    color: '#FF4D6D',
  });
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const totalCost = selectedGift.price * multiplier;
  const canAfford = profile.coins >= totalCost;

  const handleSend = async () => {
    if (!canAfford) {
      setErrorMsg('পর্যাপ্ত কয়েন নেই! কয়েন রিচার্জ করুন +');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    for (let i = 0; i < multiplier; i++) {
      await sendGift(targetUser.uid, selectedGift);
    }

    sound.giftSent();
    onGiftSent(selectedGift, multiplier);
    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-gradient-to-b from-[#1c1836] to-[#0f0c22] rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-white/10 p-5 shadow-2xl text-white animate-in">
        {/* Handle bar on mobile */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#7C4DFF]/20 flex items-center justify-center text-[#00E5FF]">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[15px] leading-tight">
                গিফট পাঠান 🎁
              </h3>
              <p className="text-[11px] text-white/50">
                প্রাপক: <span className="text-amber-300 font-bold">{targetUser.displayName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 px-2.5 py-1 rounded-full text-[12px] text-amber-300 font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span>{profile.coins.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gift Grid from Dynamic Admin Settings */}
        <div className="grid grid-cols-5 gap-2 my-4 max-h-[260px] overflow-y-auto p-1 scrollbar-hide">
          {giftsList.map((gift) => {
            const isSelected = selectedGift.id === gift.id;
            return (
              <button
                key={gift.id}
                onClick={() => {
                  setSelectedGift(gift);
                  setErrorMsg('');
                  sound.tick();
                }}
                className={`flex flex-col items-center p-2 rounded-2xl border transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-[#7C4DFF]/25 border-amber-300 shadow-[0_0_15px_rgba(124,77,255,0.4)] scale-105'
                    : 'bg-white/[0.04] border-white/5 hover:border-white/15'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[24px] shadow-sm mb-1"
                  style={{ background: `${gift.color || '#FFB800'}20` }}
                >
                  {gift.emoji}
                </div>
                <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                  {gift.name}
                </span>
                <span className="text-[9px] text-amber-300 font-extrabold flex items-center gap-0.5 mt-0.5">
                  🪙 {gift.price.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-[12px] text-rose-400 font-semibold text-center mb-2">
            {errorMsg}
          </p>
        )}

        {/* Multiplier buttons & Send button */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5">
            {[1, 5, 10, 99].map((count) => (
              <button
                key={count}
                onClick={() => setMultiplier(count)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition ${
                  multiplier === count
                    ? 'bg-amber-400 text-black shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                x{count}
              </button>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={!canAfford || isSending}
            className={`flex-1 py-3 rounded-xl font-black text-[13px] flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition ${
              canAfford
                ? 'bg-gradient-to-r from-[#7C4DFF] via-[#9B51E0] to-[#00E5FF] text-white shadow-[0_4px_20px_rgba(124,77,255,0.4)]'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSending ? 'পাঠানো হচ্ছে...' : `পাঠান (🪙 ${totalCost.toLocaleString()})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
