import React, { useState } from 'react';
import { X, Users, UserCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FollowListModalProps {
  initialTab?: 'followers' | 'following';
  onClose: () => void;
  onSelectUser: (user: { uid: string; displayName: string; avatarUrl: string; level: number }) => void;
}

const SAMPLE_COMMUNITY_USERS = [
  { uid: 'user_nusrat', displayName: 'Nusrat VIP', avatarUrl: '👩🏻‍🎤', level: 23, bio: 'ভয়েস রুমে গান গাইতে ভালোবাসি' },
  { uid: 'user_shakil_pro', displayName: 'Shakil Pro', avatarUrl: '🧑🏻‍💻', level: 35, bio: 'গেমিং মাস্টার ও চ্যাট লাভার' },
  { uid: 'user_riya', displayName: 'Riya Queen', avatarUrl: '💃', level: 19, bio: 'সবার সাথে বন্ধুত্বের আড্ডা' },
  { uid: 'user_arif', displayName: 'Arif Rock', avatarUrl: '🎸', level: 21, bio: 'গিটার ও আড্ডা' },
  { uid: 'user_tania', displayName: 'Tania Smile', avatarUrl: '🧕', level: 16, bio: 'চা ও মিষ্টি গল্প' },
  { uid: 'user_babu', displayName: 'Babu Fun', avatarUrl: '🤡', level: 14, bio: 'কমেডি আনলিমিটেড' },
];

export const FollowListModal: React.FC<FollowListModalProps> = ({
  initialTab = 'following',
  onClose,
  onSelectUser,
}) => {
  const { followingSet, toggleFollow } = useAuth();
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);

  const displayedUsers = SAMPLE_COMMUNITY_USERS;

  return (
    <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#211648] to-[#110926] rounded-3xl border-2 border-white/10 p-5 shadow-2xl text-white overflow-hidden animate-in">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-[16px] text-white">
              ফ্রেন্ডস ও ফলো তালিকা
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 rounded-xl p-1 my-3 border border-white/10">
          <button
            onClick={() => setTab('followers')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition ${
              tab === 'followers'
                ? 'bg-[#7C4DFF] text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            ফলোয়ার্স ({displayedUsers.length + 18})
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition ${
              tab === 'following'
                ? 'bg-[#7C4DFF] text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            ফলোয়িং ({followingSet.size})
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-hide">
          {displayedUsers.map((user) => {
            const isFollowing = followingSet.has(user.uid);
            return (
              <div
                key={user.uid}
                className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between hover:bg-white/[0.08] transition"
              >
                <button
                  onClick={() => {
                    onClose();
                    onSelectUser(user);
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[22px] shrink-0">
                    {user.avatarUrl}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-[13px] text-white truncate">
                        {user.displayName}
                      </h4>
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded font-bold">
                        Lv{user.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 truncate">{user.bio}</p>
                  </div>
                </button>

                <button
                  onClick={() => toggleFollow(user.uid)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 ml-2 transition active:scale-95 flex items-center gap-1 ${
                    isFollowing
                      ? 'bg-white/10 text-white/70 border border-white/15'
                      : 'bg-[#7C4DFF] text-white shadow'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {isFollowing ? 'ফলোয়িং' : 'ফলো'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
