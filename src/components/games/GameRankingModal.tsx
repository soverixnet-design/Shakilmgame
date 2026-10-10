import React from 'react';
import { X, Trophy, Crown, Flame, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GameRankingModalProps {
  gameTitle: string;
  onClose: () => void;
}

export const GameRankingModal: React.FC<GameRankingModalProps> = ({ gameTitle, onClose }) => {
  const { profile } = useAuth();

  // Top winners list (combines community champions with current user stats)
  const rankingList = [
    {
      rank: 1,
      name: 'Shakil Pro 👑',
      avatar: '🤴',
      amount: Math.max(14500000, profile.todayWon + 8000000),
      badge: 'Gamer King',
      level: 45,
    },
    {
      rank: 2,
      name: 'Nusrat VIP 🌟',
      avatar: '👸',
      amount: Math.max(9200000, profile.todayWon + 4500000),
      badge: 'Super Rich',
      level: 38,
    },
    {
      rank: 3,
      name: 'Rafi Champion 🔥',
      avatar: '🤠',
      amount: Math.max(6800000, profile.todayWon + 2000000),
      badge: 'Lucky Pro',
      level: 32,
    },
    {
      rank: 4,
      name: profile.displayName + ' (আপনি)',
      avatar: profile.avatarUrl,
      amount: profile.todayWon > 0 ? profile.todayWon : 1850000,
      badge: 'Rising Star',
      level: profile.level,
      isMe: true,
    },
    {
      rank: 5,
      name: 'Mim Queen',
      avatar: '💃',
      amount: 1420000,
      badge: 'Host VIP',
      level: 28,
    },
    {
      rank: 6,
      name: 'Arif Rock',
      avatar: '🎸',
      amount: 980000,
      badge: 'Singer',
      level: 24,
    },
    {
      rank: 7,
      name: 'Tania Smile',
      avatar: '🧕',
      amount: 750000,
      badge: 'Chatter',
      level: 19,
    },
    {
      rank: 8,
      name: 'Babu Joker',
      avatar: '🤡',
      amount: 450000,
      badge: 'Fun Star',
      level: 16,
    },
  ];

  const top3 = rankingList.slice(0, 3);
  const rest = rankingList.slice(3);

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-gradient-to-b from-[#251552] to-[#10072b] border-2 border-amber-400 rounded-2xl shadow-[0_0_50px_rgba(255,184,0,0.4)] p-5 text-white overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[17px] text-amber-300">
                🏆 আজকের শীর্ষ ৩ ও র‍্যাঙ্কিং
              </h3>
              <p className="text-[11px] text-white/50">{gameTitle} • Daily Leaderboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP 3 PODIUM */}
        <div className="pt-4 pb-3 flex items-end justify-center gap-2 border-b border-white/10">
          {/* Rank 2 (Silver) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border-2 border-slate-300 flex items-center justify-center text-[26px] shadow-lg">
                {top3[1].avatar}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                🥈 ২য়
              </span>
            </div>
            <p className="font-bold text-[12px] mt-3 truncate max-w-[90px] text-center">{top3[1].name}</p>
            <span className="text-[11px] font-extrabold text-amber-300">
              🪙 {(top3[1].amount / 1000000).toFixed(1)}M
            </span>
            <div className="w-full h-14 bg-gradient-to-t from-slate-800 to-slate-700/60 rounded-t-lg mt-1 border-t border-slate-400/40 flex items-center justify-center font-black text-slate-300 text-[18px]">
              2
            </div>
          </div>

          {/* Rank 1 (Gold - Elevated) */}
          <div className="flex-1 flex flex-col items-center -mt-4">
            <Crown className="w-7 h-7 text-amber-400 animate-bounce mb-1" />
            <div className="relative">
              <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-3 border-amber-300 flex items-center justify-center text-[34px] shadow-[0_0_20px_rgba(255,215,0,0.6)]">
                {top3[0].avatar}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow">
                🥇 ১ম
              </span>
            </div>
            <p className="font-extrabold text-[13px] mt-3 truncate max-w-[100px] text-center text-amber-200">{top3[0].name}</p>
            <span className="text-[12px] font-black text-amber-300">
              🪙 {(top3[0].amount / 1000000).toFixed(1)}M
            </span>
            <div className="w-full h-20 bg-gradient-to-t from-amber-700 to-amber-500/80 rounded-t-lg mt-1 border-t-2 border-yellow-300 flex items-center justify-center font-black text-yellow-100 text-[24px]">
              1
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-600 flex items-center justify-center text-[26px] shadow-lg">
                {top3[2].avatar}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                🥉 ৩য়
              </span>
            </div>
            <p className="font-bold text-[12px] mt-3 truncate max-w-[90px] text-center">{top3[2].name}</p>
            <span className="text-[11px] font-extrabold text-amber-300">
              🪙 {(top3[2].amount / 1000000).toFixed(1)}M
            </span>
            <div className="w-full h-11 bg-gradient-to-t from-amber-900 to-amber-800/60 rounded-t-lg mt-1 border-t border-amber-700/40 flex items-center justify-center font-black text-amber-300 text-[16px]">
              3
            </div>
          </div>
        </div>

        {/* REST OF RANKINGS (4 to 8) */}
        <div className="overflow-y-auto flex-1 py-2 space-y-1.5 scrollbar-hide">
          <p className="text-[11px] text-white/50 px-1 font-semibold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" /> অন্যান্য বিজয়ী তালিকা:
          </p>

          {rest.map((user) => (
            <div
              key={user.rank}
              className={`rounded-xl px-3 py-2 flex items-center justify-between text-[13px] border transition ${
                user.isMe
                  ? 'bg-[#7C4DFF]/20 border-[#7C4DFF] shadow-[0_0_15px_rgba(124,77,255,0.3)]'
                  : 'bg-white/[0.04] border-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 text-center font-extrabold text-white/60 text-[13px]">
                  #{user.rank}
                </span>
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[18px]">
                  {user.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] text-white">
                      {user.name}
                    </span>
                    <span className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                      Lv{user.level}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    {user.badge}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-extrabold text-[13px] text-amber-300">
                  🪙 {user.amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-white/30 block">আজকের মোট জয়</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg active:scale-98 transition"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
