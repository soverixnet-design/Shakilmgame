import React, { useState } from 'react';
import {
  User,
  Edit3,
  Camera,
  Coins,
  Trophy,
  Gift,
  Users,
  UserCheck,
  LogIn,
  LogOut,
  Shield,
  Star,
  Flame,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { useAuth, GIFTS_CATALOG, DEFAULT_AVATARS } from '../context/AuthContext';
import { FollowListModal } from './FollowListModal';
import { VipFrameModal, VIP_FRAMES } from './VipFrameModal';
import { UserProfileModal } from './UserProfileModal';

export const ProfileTab: React.FC = () => {
  const {
    profile,
    isLoggedInWithGoogle,
    loginWithGoogle,
    logout,
    updateUserProfile,
    addDemoCoins,
  } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(profile.displayName);
  const [avatarInput, setAvatarInput] = useState<string>(profile.avatarUrl);
  const [bioInput, setBioInput] = useState<string>(profile.bio || '');

  // Modals
  const [showFollowModal, setShowFollowModal] = useState<boolean>(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');
  const [showVipFrameModal, setShowVipFrameModal] = useState<boolean>(false);
  const [inspectedFriend, setInspectedFriend] = useState<any | null>(null);

  // Active VIP Frame
  const [activeFrameId, setActiveFrameId] = useState<string>(() => {
    return localStorage.getItem('active_vip_frame') || 'gold';
  });
  const currentFrame = VIP_FRAMES.find((f) => f.id === activeFrameId) || VIP_FRAMES[0];

  const receivedGifts = profile.receivedGifts || {};
  const totalGiftCount = Object.values(receivedGifts).reduce((a, b) => a + b, 0);

  const totalGiftsCoinValue = Object.entries(receivedGifts).reduce((sum, [giftId, count]) => {
    const gift = GIFTS_CATALOG.find((g) => g.id === giftId);
    return sum + (gift ? gift.price * count : 0);
  }, 0);

  const handleSave = async () => {
    await updateUserProfile(nameInput, avatarInput, bioInput);
    setIsEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectFrame = (frameId: string) => {
    setActiveFrameId(frameId);
    localStorage.setItem('active_vip_frame', frameId);
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 max-w-md mx-auto">
      {/* Header Profile Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#23184d] via-[#1b123d] to-[#120a2e] border-2 border-white/10 p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-[#7C4DFF]/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            {/* Avatar with VIP Frame */}
            <div className="relative group">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-[40px] bg-[#1a1136] shadow-xl ${currentFrame.borderClass} ${currentFrame.glowClass}`}
              >
                {profile.avatarUrl.startsWith('data:') || profile.avatarUrl.startsWith('http') ? (
                  <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{profile.avatarUrl}</span>
                )}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow active:scale-90"
                title="ছবি পরিবর্তন"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-[20px] text-white leading-tight">
                  {profile.displayName}
                </h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-extrabold">
                  Lv {profile.level}
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-mono mt-0.5">
                UID: {profile.uid.substring(0, 12)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setShowVipFrameModal(true)}
                  className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 active:scale-95"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  {currentFrame.name.split(' ')[0]} ফ্রেম
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setNameInput(profile.displayName);
              setAvatarInput(profile.avatarUrl);
              setBioInput(profile.bio || '');
              setIsEditing(true);
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition"
            title="এডিট প্রোফাইল"
          >
            <Edit3 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stats Row - Clickable for Followers & Following */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center">
          <button
            onClick={() => {
              setFollowModalTab('followers');
              setShowFollowModal(true);
            }}
            className="bg-white/5 hover:bg-white/10 rounded-2xl p-2 border border-white/5 transition active:scale-95"
          >
            <span className="text-[16px] font-black text-white block">
              {profile.followersCount}
            </span>
            <span className="text-[10px] text-white/40 font-semibold uppercase">Followers</span>
          </button>

          <button
            onClick={() => {
              setFollowModalTab('following');
              setShowFollowModal(true);
            }}
            className="bg-white/5 hover:bg-white/10 rounded-2xl p-2 border border-white/5 transition active:scale-95"
          >
            <span className="text-[16px] font-black text-white block">
              {profile.followingCount}
            </span>
            <span className="text-[10px] text-white/40 font-semibold uppercase">Following</span>
          </button>

          <div className="bg-white/5 rounded-2xl p-2 border border-white/5">
            <span className="text-[16px] font-black text-amber-300 block">
              {totalGiftCount}
            </span>
            <span className="text-[10px] text-white/40 font-semibold uppercase">Gifts</span>
          </div>
        </div>
      </div>

      {/* Google Login Status Bar */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            {isLoggedInWithGoogle ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <User className="w-5 h-5 text-white/60" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-[13px]">
              {isLoggedInWithGoogle ? 'গুগল অ্যাকাউন্ট সংযুক্ত' : 'ডেমো / অতিথি মোডে আছেন'}
            </h4>
            <p className="text-[11px] text-white/50">
              {isLoggedInWithGoogle
                ? 'আপনার সব কয়েন ও ফলো ডেটা ফায়ারবেসে সংরক্ষিত'
                : 'সব ডেটা রিয়েলটাইমে সেভ রাখতে লগইন করুন'}
            </p>
          </div>
        </div>

        {isLoggedInWithGoogle ? (
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-rose-400 font-bold text-[11px] flex items-center gap-1 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            লগআউট
          </button>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-black text-[12px] flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            গুগল লগইন
          </button>
        )}
      </div>

      {/* Wallet & Game Earnings Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1b1b2d] to-[#141424] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-[14px]">কয়েন ও আর্নিং পরিসংখ্যান</h4>
          </div>
          <button
            onClick={() => addDemoCoins(1000000)}
            className="text-[11px] font-bold text-emerald-400 hover:underline"
          >
            +১০ লক্ষ যোগ করুন
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
            <span className="text-[11px] text-white/50 block">ওয়ালেট কয়েন</span>
            <span className="text-[18px] font-black text-amber-300">
              🪙 {profile.coins.toLocaleString()}
            </span>
          </div>

          <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
            <span className="text-[11px] text-white/50 block">আজকের মোট জয়</span>
            <span className="text-[18px] font-black text-emerald-400">
              🪙 {profile.todayWon.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* RECEIVED GIFTS GALLERY (প্রোফাইলে প্রাপ্ত গিফটের বিস্তারিত শোকেস) */}
      <div className="rounded-3xl bg-gradient-to-b from-[#211648] to-[#120a2c] border-2 border-amber-400/40 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-[15px] text-amber-300">
                আমার প্রাপ্ত গিফট সংগ্রহ
              </h3>
              <p className="text-[11px] text-white/50">
                মোট মূল্য: 🪙 {totalGiftsCoinValue.toLocaleString()} কয়েন
              </p>
            </div>
          </div>
          <span className="text-[11px] font-black bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/30">
            {totalGiftCount} টি গিফট
          </span>
        </div>

        {/* Gifts Display Grid */}
        <div className="grid grid-cols-5 gap-2">
          {GIFTS_CATALOG.map((gift) => {
            const count = receivedGifts[gift.id] || 0;
            return (
              <div
                key={gift.id}
                className={`flex flex-col items-center p-2 rounded-2xl border text-center transition ${
                  count > 0
                    ? 'bg-white/10 border-amber-400/60 shadow-[0_0_12px_rgba(255,180,0,0.2)]'
                    : 'bg-white/[0.02] border-white/5 opacity-40'
                }`}
              >
                <span className="text-[28px]">{gift.emoji}</span>
                <span className="text-[10px] font-bold text-white/80 truncate max-w-full leading-tight mt-0.5">
                  {gift.name}
                </span>
                <span className={`text-[10px] font-black mt-0.5 ${count > 0 ? 'text-amber-300' : 'text-white/30'}`}>
                  x{count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#23184d] to-[#120a2e] rounded-3xl border-2 border-white/20 p-5 shadow-2xl text-white animate-in space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-[17px] text-amber-300">
                প্রোফাইল পিক ও নাম পরিবর্তন ✏️
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[12px] font-bold text-white/70 block mb-2">
                অবতার নির্বাচন করুন
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DEFAULT_AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setAvatarInput(av)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[22px] border transition ${
                      avatarInput === av
                        ? 'bg-[#7C4DFF] border-white shadow-lg scale-105'
                        : 'bg-white/10 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <label className="block text-center py-2.5 px-3 rounded-xl bg-white/10 border border-dashed border-white/20 text-[12px] text-amber-200 cursor-pointer active:scale-98">
                📷 ফোন থেকে ছবি আপলোড করুন
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="text-[12px] font-bold text-white/70 block mb-1">
                আপনার নাম
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-3 font-semibold text-[14px] outline-none focus:border-[#7C4DFF]"
                placeholder="নাম বসান..."
              />
            </div>

            <div>
              <label className="text-[12px] font-bold text-white/70 block mb-1">
                স্ট্যাটাস / বায়ো
              </label>
              <input
                type="text"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={60}
                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-3 text-[13px] outline-none focus:border-[#7C4DFF]"
                placeholder="নিজের সম্পর্কে লিখুন..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-[13px]"
              >
                বাতিল
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white font-black text-[13px] shadow-lg active:scale-95"
              >
                সংরক্ষণ করুন ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOWERS & FOLLOWING LIST MODAL */}
      {showFollowModal && (
        <FollowListModal
          initialTab={followModalTab}
          onClose={() => setShowFollowModal(false)}
          onSelectUser={(u) => setInspectedFriend(u)}
        />
      )}

      {/* VIP FRAME STORE MODAL */}
      {showVipFrameModal && (
        <VipFrameModal
          currentFrameId={activeFrameId}
          onSelectFrame={handleSelectFrame}
          onClose={() => setShowVipFrameModal(false)}
        />
      )}

      {/* FRIEND PROFILE MODAL */}
      {inspectedFriend && (
        <UserProfileModal
          user={inspectedFriend}
          onClose={() => setInspectedFriend(null)}
        />
      )}
    </div>
  );
};
