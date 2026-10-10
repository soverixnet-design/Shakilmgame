import React, { useState, useEffect } from 'react';
import { Trophy, Gift, Crown, Flame, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfileModal } from './UserProfileModal';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  avatarUrl: string;
  amount: number;
  level: number;
  vipFrame?: string;
}

const INITIAL_GIFT_SENDERS: LeaderboardUser[] = [
  {
    uid: 'user_boss_raju',
    displayName: 'Raju King 👑',
    avatarUrl: '🤴',
    amount: 15850000,
    level: 42,
    vipFrame: 'gold',
  },
  {
    uid: 'user_shakil_vip',
    displayName: 'Shakil Pro 🔥',
    avatarUrl: '🦁',
    amount: 9420000,
    level: 38,
    vipFrame: 'dragon',
  },
  {
    uid: 'user_priyo_spicy',
    displayName: 'Priyo Spicy 🌶️',
    avatarUrl: '💎',
    amount: 5640000,
    level: 31,
    vipFrame: 'cyber',
  },
  {
    uid: 'user_joya_star',
    displayName: 'Joya Star ⭐',
    avatarUrl: '👸',
    amount: 3200000,
    level: 26,
  },
  {
    uid: 'user_badhon_bd',
    displayName: 'Badhon BD 🇧🇩',
    avatarUrl: '😎',
    amount: 2150000,
    level: 22,
  },
  {
    uid: 'user_mitu_queen',
    displayName: 'Mitu Sweet 🌸',
    avatarUrl: '🧕',
    amount: 1850000,
    level: 19,
  },
];

const INITIAL_GIFT_RECEIVERS: LeaderboardUser[] = [
  {
    uid: 'user_shaan_star',
    displayName: 'Shaan Voice 🎤',
    avatarUrl: '🎙️',
    amount: 18920000,
    level: 45,
    vipFrame: 'svip',
  },
  {
    uid: 'user_maya_singer',
    displayName: 'Maya Melody 🎵',
    avatarUrl: '💃',
    amount: 12450000,
    level: 39,
    vipFrame: 'gold',
  },
  {
    uid: 'user_miraz_king',
    displayName: 'Miraz DJ 🎧',
    avatarUrl: '👑',
    amount: 7890000,
    level: 33,
    vipFrame: 'flame',
  },
  {
    uid: 'user_tania_smile',
    displayName: 'Tania Smile 🌸',
    avatarUrl: '🧕',
    amount: 4500000,
    level: 28,
  },
  {
    uid: 'user_babu_fun',
    displayName: 'Babu Babu 🤡',
    avatarUrl: '🤡',
    amount: 2900000,
    level: 24,
  },
  {
    uid: 'user_roopkotha',
    displayName: 'Roopkotha 💖',
    avatarUrl: '🌹',
    amount: 1720000,
    level: 18,
  },
];

export const DailyLeaderboardHeader: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'senders' | 'receivers'>('senders');
  const [showFullModal, setShowFullModal] = useState<boolean>(false);
  const [inspectedUser, setInspectedUser] = useState<any | null>(null);

  const [sendersList, setSendersList] = useState<LeaderboardUser[]>(INITIAL_GIFT_SENDERS);
  const [receiversList, setReceiversList] = useState<LeaderboardUser[]>(INITIAL_GIFT_RECEIVERS);

  // Update live when gifts are sent
  useEffect(() => {
    const handleGift = (e: any) => {
      const gift = e.detail?.gift;
      if (!gift) return;

      // Add to sender
      setSendersList((prev) => {
        const copy = [...prev];
        const meIndex = copy.findIndex((u) => u.uid === profile.uid);
        if (meIndex >= 0) {
          copy[meIndex].amount += gift.price;
        } else {
          copy.push({
            uid: profile.uid,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            amount: gift.price,
            level: profile.level,
          });
        }
        return copy.sort((a, b) => b.amount - a.amount);
      });
    };

    window.addEventListener('gift_received', handleGift);
    return () => window.removeEventListener('gift_received', handleGift);
  }, [profile]);

  const currentList = activeTab === 'senders' ? sendersList : receiversList;
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  const formatCoins = (amt: number) => {
    if (amt >= 1000000) return (amt / 1000000).toFixed(1) + 'M';
    if (amt >= 1000) return (amt / 1000).toFixed(0) + 'K';
    return amt.toLocaleString();
  };

  return (
    <div className="mx-4 mt-2 mb-3 select-none">
      {/* Container Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#241548] via-[#170c32] to-[#0d061e] border-2 border-amber-400/40 p-3.5 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-32 h-16 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* Tab Buttons & Title */}
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="font-black text-[12px] text-white">দৈনিক র‍্যাঙ্কিং</h2>
          </div>

          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-extrabold">
            <button
              onClick={() => setActiveTab('senders')}
              className={`px-2 py-0.5 rounded-md transition ${
                activeTab === 'senders'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🎁 গিফটার্স
            </button>
            <button
              onClick={() => setActiveTab('receivers')}
              className={`px-2 py-0.5 rounded-md transition ${
                activeTab === 'receivers'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              👑 রিসিভার্স
            </button>
          </div>
        </div>

        {/* 3-PODIUM WINNERS ARENA (Compact Mobile Size) */}
        <div className="flex items-end justify-center gap-1.5 pt-2 pb-0.5">
          {/* 2nd Place (Silver) */}
          {top2 && (
            <button
              onClick={() => setInspectedUser(top2)}
              className="flex-1 flex flex-col items-center group active:scale-95 transition"
            >
              <div className="relative mb-0.5">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px]">🥈</span>
                <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-br from-slate-300 via-white to-slate-400 shadow">
                  <div className="w-full h-full rounded-full bg-[#1e133a] flex items-center justify-center text-[16px]">
                    {top2.avatarUrl}
                  </div>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-300 text-black text-[7px] font-black px-1 rounded-full shadow">
                  #2
                </span>
              </div>
              <p className="text-[10px] font-black text-white/90 truncate max-w-[70px] leading-tight">
                {top2.displayName}
              </p>
              <span className="text-[9px] font-extrabold text-amber-300 leading-tight">
                🪙 {formatCoins(top2.amount)}
              </span>
            </button>
          )}

          {/* 1st Place (Gold Center - Elevated) */}
          {top1 && (
            <button
              onClick={() => setInspectedUser(top1)}
              className="flex-1 flex flex-col items-center group active:scale-95 transition -translate-y-0.5"
            >
              <div className="relative mb-0.5">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[14px] filter drop-shadow">
                  👑
                </span>
                <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                  <div className="w-full h-full rounded-full bg-[#201442] flex items-center justify-center text-[20px]">
                    {top1.avatarUrl}
                  </div>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[8px] font-black px-1.5 rounded-full shadow">
                  #1 🥇
                </span>
              </div>
              <p className="text-[10px] font-black text-amber-300 truncate max-w-[80px] leading-tight">
                {top1.displayName}
              </p>
              <span className="text-[9px] font-black text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded-full border border-amber-400/30 leading-tight">
                🪙 {formatCoins(top1.amount)}
              </span>
            </button>
          )}

          {/* 3rd Place (Bronze) */}
          {top3 && (
            <button
              onClick={() => setInspectedUser(top3)}
              className="flex-1 flex flex-col items-center group active:scale-95 transition"
            >
              <div className="relative mb-0.5">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px]">🥉</span>
                <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-br from-amber-700 via-orange-400 to-amber-800 shadow">
                  <div className="w-full h-full rounded-full bg-[#1e133a] flex items-center justify-center text-[16px]">
                    {top3.avatarUrl}
                  </div>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-700 text-white text-[7px] font-black px-1 rounded-full shadow">
                  #3
                </span>
              </div>
              <p className="text-[10px] font-black text-white/90 truncate max-w-[70px] leading-tight">
                {top3.displayName}
              </p>
              <span className="text-[9px] font-extrabold text-amber-300 leading-tight">
                🪙 {formatCoins(top3.amount)}
              </span>
            </button>
          )}
        </div>

        {/* View Full Top 10 button */}
        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
          <span className="text-white/40">রিয়েলটাইম ডেইলি কয়েন স্কোর</span>
          <button
            onClick={() => setShowFullModal(true)}
            className="text-amber-300 font-bold flex items-center gap-0.5 hover:underline active:scale-95"
          >
            <span>সম্পূর্ণ (Top 10)</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* FULL TOP 10 LEADERBOARD MODAL */}
      {showFullModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#221344] via-[#160a30] to-[#0d051e] rounded-3xl border-2 border-amber-400/80 p-5 text-white shadow-2xl flex flex-col max-h-[85vh] animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-[16px] text-amber-300">
                  {activeTab === 'senders' ? '🎁 সেরা দৈনিক গিফটার্স' : '👑 সেরা দৈনিক রিসিভার্স'}
                </h3>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 py-3 scrollbar-hide">
              {currentList.map((user, idx) => (
                <button
                  key={user.uid}
                  onClick={() => {
                    setShowFullModal(false);
                    setInspectedUser(user);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-400/50 flex items-center justify-between gap-3 text-left transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 text-center font-black text-[14px] ${
                        idx === 0
                          ? 'text-amber-300 text-[18px]'
                          : idx === 1
                          ? 'text-slate-300 text-[16px]'
                          : idx === 2
                          ? 'text-amber-600 text-[16px]'
                          : 'text-white/40'
                      }`}
                    >
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/40 to-purple-600/40 p-0.5">
                      <div className="w-full h-full rounded-full bg-[#180e30] flex items-center justify-center text-[20px]">
                        {user.avatarUrl}
                      </div>
                    </div>
                    <div>
                      <p className="font-extrabold text-[13px] text-white truncate max-w-[130px]">
                        {user.displayName}
                      </p>
                      <span className="text-[10px] text-white/40">Lv.{user.level || 15}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-[13px] text-amber-300 block">
                      🪙 {user.amount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-white/40 uppercase">
                      {activeTab === 'senders' ? 'পাঠিয়েছেন' : 'পেয়েছেন'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT USER MODAL */}
      {inspectedUser && (
        <UserProfileModal
          user={{
            uid: inspectedUser.uid,
            displayName: inspectedUser.displayName,
            avatarUrl: inspectedUser.avatarUrl,
            level: inspectedUser.level || 20,
          }}
          onClose={() => setInspectedUser(null)}
        />
      )}
    </div>
  );
};
