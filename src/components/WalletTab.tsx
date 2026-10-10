import React, { useState } from 'react';
import { Coins, Sparkles, TrendingUp, Check, Flame, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/SettingsContext';
import { sound } from '../utils/sound';

export const WalletTab: React.FC = () => {
  const { profile, addDemoCoins, adjustCoins } = useAuth();
  const { settings } = useAppSettings();
  const coinPackages = settings.packages;

  const [dailyClaimed, setDailyClaimed] = useState<boolean>(() => {
    return localStorage.getItem('daily_claimed_date') === new Date().toDateString();
  });
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleClaimDaily = () => {
    if (dailyClaimed) return;
    const bonus = 100000;
    adjustCoins(bonus, 0);
    sound.winFanfare();
    setDailyClaimed(true);
    localStorage.setItem('daily_claimed_date', new Date().toDateString());
    setSuccessMsg(`🎉 দৈনিক বোনাস +${bonus.toLocaleString()} কয়েন ওয়ালেটে যোগ হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleBuyPackage = (pkg: typeof coinPackages[0]) => {
    addDemoCoins(pkg.coins);
    sound.winFanfare();
    setSuccessMsg(`🎉 সফল রিচার্জ! +${(pkg.coins / 1000000).toFixed(0)} মিলিয়ন কয়েন ওয়ালেটে যোগ হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 max-w-md mx-auto">
      {/* Wallet Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#281a54] via-[#1a113a] to-[#0e0722] border-2 border-amber-400/50 p-6 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-400/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-widest block mb-1">
            ম্যান ওয়ালেট ও গেম ব্যালেন্স 🪙
          </span>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-[36px] font-black tracking-tight text-white leading-none">
              {profile.coins.toLocaleString()}
            </span>
            <span className="text-[14px] text-amber-400 font-extrabold">কয়েন</span>
          </div>

          <p className="text-[12px] text-white/60">
            এই কয়েন দিয়ে যেকোনো গেম খেলা যায় এবং সরাসরি ভয়েস রুমে বন্ধুদের গিফট পাঠানো যায়।
          </p>

          <div className="flex gap-2.5 mt-5">
            <div className="flex-1 py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-center">
              <span className="text-[10px] text-white/50 block">কয়েন স্ট্যাটাস</span>
              <span className="text-[12px] font-black text-amber-300">অফিশিয়াল ভ্যালিড ব্যালেন্স</span>
            </div>

            <button
              onClick={handleClaimDaily}
              disabled={dailyClaimed}
              className={`px-4 py-2.5 rounded-xl font-bold text-[12px] transition flex items-center gap-1.5 ${
                dailyClaimed
                  ? 'bg-white/10 text-white/40 cursor-default'
                  : 'bg-[#7C4DFF] hover:bg-[#6f3ef0] text-white shadow active:scale-95'
              }`}
            >
              {dailyClaimed ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4" />}
              {dailyClaimed ? 'দৈনিক দাবি সম্পন্ন' : 'দৈনিক বোনাস'}
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[13px] font-bold p-3 rounded-xl text-center shadow animate-in">
          {successMsg}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-white/50 block">আজকের মোট জয়</span>
            <span className="text-[15px] font-extrabold text-white">🪙 {profile.todayWon.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-white/50 block">সর্বমোট জয়</span>
            <span className="text-[15px] font-extrabold text-white">🪙 {profile.totalWon.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Coin Packages Configured by Admin */}
      <div className="space-y-2.5">
        <h4 className="font-extrabold text-[15px] text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          কয়েন প্যাকেজ সমূহ (তাত্ক্ষণিক রিচার্জ)
        </h4>

        {coinPackages.map((pkg, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-3.5 flex items-center justify-between transition ${
              pkg.popular
                ? 'bg-[#7C4DFF]/15 border-amber-300 shadow-[0_0_15px_rgba(124,77,255,0.2)]'
                : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-[22px] shadow">
                🪙
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] text-white">
                    {pkg.coins >= 1000000
                      ? (pkg.coins / 1000000).toFixed(pkg.coins % 1000000 !== 0 ? 1 : 0) + ' মিলিয়ন কয়েন'
                      : pkg.coins.toLocaleString() + ' কয়েন'}
                  </span>
                  {pkg.bonus && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                      {pkg.bonus}
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-white/50 font-medium">{pkg.price}</span>
              </div>
            </div>

            <button
              onClick={() => handleBuyPackage(pkg)}
              className={`px-4 py-2 rounded-xl font-black text-[12px] shadow active:scale-95 transition ${
                pkg.popular
                  ? 'bg-amber-400 text-black hover:bg-amber-300'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              রিচার্জ
            </button>
          </div>
        ))}
      </div>

      {/* Agency Reseller Notice */}
      <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-3.5 text-center space-y-1">
        <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider block">
          💎 অফিশিয়াল রিসেলার / ডিলার রেট
        </span>
        <p className="text-[12px] text-white/80 font-bold">
          ১০০ টাকায় ৫ মিলিয়ন কয়েন সহ বিকাশ/নগদে যেকোনো পরিমাণের কয়েন সরাসরি সংগ্রহ করুন।
        </p>
      </div>
    </div>
  );
};
