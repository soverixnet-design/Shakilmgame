import React, { useState } from 'react';
import { X, UserPlus, UserCheck, Gift, Trophy, Star, Edit3, Shield, Coins } from 'lucide-react';
import { useAuth, GIFTS_CATALOG, DEFAULT_AVATARS } from '../context/AuthContext';

interface UserProfileModalProps {
  user: {
    uid: string;
    displayName: string;
    avatarUrl: string;
    level?: number;
    bio?: string;
    receivedGifts?: Record<string, number>;
  };
  onClose: () => void;
  onOpenGifting?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onOpenGifting,
}) => {
  const { profile, followingSet, toggleFollow, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.displayName);
  const [editAvatar, setEditAvatar] = useState<string>(profile.avatarUrl);
  const [editBio, setEditBio] = useState<string>(profile.bio || '');

  const isMe = user.uid === profile.uid || user.uid === 'me';
  const isFollowing = followingSet.has(user.uid);

  const [dynamicGifts, setDynamicGifts] = useState<Record<string, number>>(() => {
    if (isMe) return profile.receivedGifts || {};
    try {
      const cached = JSON.parse(localStorage.getItem(`received_gifts_${user.uid}`) || '{}');
      if (Object.keys(cached).length > 0) return cached;
    } catch {}
    return user.receivedGifts || { g1: 8, g2: 5, g5: 2 };
  });

  React.useEffect(() => {
    const handleGiftEvent = (e: any) => {
      if (e.detail?.targetUid === user.uid || (isMe && e.detail?.targetUid === profile.uid)) {
        try {
          const cached = JSON.parse(localStorage.getItem(`received_gifts_${user.uid}`) || '{}');
          setDynamicGifts(cached);
        } catch {}
      }
    };
    window.addEventListener('gift_received', handleGiftEvent);
    return () => window.removeEventListener('gift_received', handleGiftEvent);
  }, [user.uid, isMe, profile.uid]);

  const targetReceivedGifts = isMe ? (profile.receivedGifts || dynamicGifts) : dynamicGifts;
  const totalGiftsCount = Object.values(targetReceivedGifts).reduce((a, b) => a + b, 0);

  const handleSaveProfile = async () => {
    await updateUserProfile(editName, editAvatar, editBio);
    setIsEditing(false);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#20183e] to-[#0f0b24] rounded-3xl border-2 border-white/10 shadow-2xl p-5 text-white overflow-hidden animate-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-4 border-b border-white/10">
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] p-0.5 shadow-xl">
              <div className="w-full h-full rounded-[14px] bg-[#1a1436] flex items-center justify-center text-[40px] overflow-hidden">
                {editAvatar.startsWith('data:') || editAvatar.startsWith('http') ? (
                  <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{isMe ? profile.avatarUrl : user.avatarUrl}</span>
                )}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow">
              Lv {isMe ? profile.level : user.level || 12}
            </span>
          </div>

          <h3 className="font-extrabold text-[18px] text-white flex items-center gap-1.5">
            {isMe ? profile.displayName : user.displayName}
            <span className="text-[#00E5FF] text-[14px]">✓</span>
          </h3>
          <p className="text-[12px] text-white/50 mt-0.5">
            ID: {user.uid.substring(0, 10)}
          </p>
          <p className="text-[12px] text-white/80 mt-1 max-w-[240px]">
            {isMe ? profile.bio : user.bio || 'ভয়েস রুমে আড্ডা ও গান পছন্দ করি 🎶'}
          </p>

          {/* Followers / Following Stats */}
          <div className="flex items-center gap-6 mt-3 text-center">
            <div>
              <span className="font-black text-[15px] block text-white">
                {isMe ? profile.followersCount : 124}
              </span>
              <span className="text-[10px] text-white/40 uppercase">Followers</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <span className="font-black text-[15px] block text-white">
                {isMe ? profile.followingCount : 45}
              </span>
              <span className="text-[10px] text-white/40 uppercase">Following</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <span className="font-black text-[15px] block text-amber-300">
                {totalGiftsCount}
              </span>
              <span className="text-[10px] text-white/40 uppercase">Gifts</span>
            </div>
          </div>

          {/* Action buttons: Follow or Edit Profile */}
          <div className="flex gap-2 w-full mt-4">
            {isMe ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Edit3 className="w-4 h-4" />
                প্রোফাইল এডিট করুন
              </button>
            ) : (
              <>
                <button
                  onClick={() => toggleFollow(user.uid)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition ${
                    isFollowing
                      ? 'bg-white/15 text-white/80 border border-white/20'
                      : 'bg-[#7C4DFF] hover:bg-[#6f3ef0] text-white shadow-[0_4px_16px_rgba(124,77,255,0.4)]'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'ফলো করা হয়েছে' : '+ ফলো করুন'}
                </button>
                {onOpenGifting && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenGifting();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 shadow"
                  >
                    <Gift className="w-4 h-4" /> গিফট দিন
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* RECEIVED GIFTS SHOWCASE */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-[13px] text-amber-300 flex items-center gap-1.5">
              <Gift className="w-4 h-4" />
              প্রাপ্ত গিফট কালেকশন ({totalGiftsCount} টি)
            </h4>
            <span className="text-[10px] text-white/40">রিয়েলটাইম শোকেস</span>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-[170px] overflow-y-auto scrollbar-hide p-1">
            {GIFTS_CATALOG.map((gift) => {
              const count = targetReceivedGifts[gift.id] || 0;
              return (
                <div
                  key={gift.id}
                  className={`flex flex-col items-center p-2 rounded-xl border text-center relative ${
                    count > 0
                      ? 'bg-white/[0.07] border-amber-300/40 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 opacity-50'
                  }`}
                >
                  <span className="text-[26px]">{gift.emoji}</span>
                  <span className="text-[10px] font-bold text-white/80 truncate max-w-full">
                    {gift.name}
                  </span>
                  {count > 0 ? (
                    <span className="text-[10px] font-black text-amber-300">
                      x{count}
                    </span>
                  ) : (
                    <span className="text-[9px] text-white/30">0</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* EDIT PROFILE MODAL OVERLAY */}
        {isEditing && (
          <div className="absolute inset-0 bg-[#171131] p-5 flex flex-col justify-between z-30 animate-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-extrabold text-[16px] text-amber-300">
                  নিজের প্রোফাইল এডিট করুন ✏️
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="text-[11px] font-bold text-white/60 block mb-1.5">
                  প্রোফাইল পিক / অবতার নির্বাচন
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setEditAvatar(av)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[20px] border transition ${
                        editAvatar === av
                          ? 'bg-[#7C4DFF] border-white shadow'
                          : 'bg-white/10 border-white/10'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>

                {/* Custom Photo Upload */}
                <label className="block text-center py-2 px-3 rounded-xl bg-white/10 border border-dashed border-white/20 text-[11px] text-amber-200 cursor-pointer active:scale-98">
                  📷 গ্যালারি থেকে ছবি আপলোড করুন
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Name input */}
              <div>
                <label className="text-[11px] font-bold text-white/60 block mb-1">
                  নিজের নাম
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={30}
                  className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-3 font-semibold text-[14px] outline-none focus:border-[#7C4DFF]"
                  placeholder="আপনার নাম লিখুন..."
                />
              </div>

              {/* Bio input */}
              <div>
                <label className="text-[11px] font-bold text-white/60 block mb-1">
                  বায়ো / স্ট্যাটাস
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={60}
                  className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-3 text-[13px] outline-none focus:border-[#7C4DFF]"
                  placeholder="আপনার সম্পর্কে কিছু বলুন..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-[13px]"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white font-extrabold text-[13px] shadow active:scale-95"
              >
                সংরক্ষণ করুন ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
