import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Gamepad2,
  Flame,
  Search,
  Plus,
  Coins,
  Gift,
  Trophy,
  User,
  Radio,
  Sparkles,
  Users,
  Lock,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { query, where } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useAppSettings } from './context/SettingsContext';
import { VoiceRoom } from './types';
import { VoiceRoomView } from './components/VoiceRoomView';
import { GameHub } from './components/games/GameHub';
import { WalletTab } from './components/WalletTab';
import { ProfileTab } from './components/ProfileTab';
import { GameRankingModal } from './components/games/GameRankingModal';
import { DailyLuckyWheelModal } from './components/DailyLuckyWheelModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DailyLeaderboardHeader } from './components/DailyLeaderboardHeader';

const ROOT_ADMIN_EMAIL = 'soverixnet@gmail.com';

function MainApp() {
  const { isAdmin, profile, currentUser, isLoggedInWithGoogle, loginWithGoogle, addDemoCoins } = useAuth();
  const { settings } = useAppSettings();

  const [activeTab, setActiveTab] = useState<'rooms' | 'games' | 'wallet' | 'profile'>('rooms');
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);

  // Modals
  const [showCreateRoom, setShowCreateRoom] = useState<boolean>(false);
  const [newRoomTitle, setNewRoomTitle] = useState<string>('');
  const [newRoomTopic, setNewRoomTopic] = useState<string>('Adda');
  const [isPrivateRoom, setIsPrivateRoom] = useState<boolean>(false);
  const [showRankingModal, setShowRankingModal] = useState<boolean>(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [inspectUserModal, setInspectUserModal] = useState<any | null>(null);

  // Admin access check (root email or granted UIDs)


  // Firestore Live Rooms Sync
  useEffect(() => {
    try {
      const roomsRef = query(collection(db, 'rooms'), where('isPrivate', '==', false));
      const unsubscribe = onSnapshot(
        roomsRef,
        (snapshot) => {
          setRooms(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as VoiceRoom)));
        },
        (err) => {
          console.warn('Rooms onSnapshot:', err);
        }
      );

      return () => unsubscribe();
    } catch {}
  }, []);

  const categories = ['all', ...settings.roomSettings.categories];

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hostName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    return room.topic.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleCreateRoom = async () => {
    if (!currentUser) { alert('রুম তৈরি করতে লগইন করুন।'); return; }
    if (isPrivateRoom) { alert('প্রাইভেট রুমের আমন্ত্রণ ব্যবস্থা এখনও চালু হয়নি। পাবলিক রুম তৈরি করুন।'); return; }
    if (!newRoomTitle.trim()) return;
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    const newRoom: VoiceRoom = {
      id: roomId,
      title: newRoomTitle.trim(),
      topic: newRoomTopic,
      hostId: profile.uid,
      hostName: profile.displayName,
      hostAvatar: profile.avatarUrl,
      participantsCount: 1,
      isPrivate: isPrivateRoom,
      seats: [],
      bgGradient: 'from-violet-600 to-indigo-700',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'rooms', roomId), newRoom);
      setActiveRoom(newRoom); setShowCreateRoom(false); setNewRoomTitle('');
    } catch { alert('রুম তৈরি হয়নি। Firebase সংযোগ ও অনুমতি চেক করুন।'); }

  };

  if (activeRoom) {
    return <VoiceRoomView room={activeRoom} onLeave={() => setActiveRoom(null)} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#07050d] text-white flex flex-col justify-between font-sans relative overflow-x-hidden">
      {/* Dynamic Top Announcement Ticker */}
      {settings.branding.announcement && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black py-0.5 px-3 text-[10px] font-black overflow-hidden whitespace-nowrap shadow-sm flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-red-950 animate-bounce" />
          <span className="truncate">{settings.branding.announcement}</span>
        </div>
      )}

      {/* Top Main Navigation Bar (Dynamic Branding) */}
      <header className="sticky top-0 z-30 bg-[#120a22]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C4DFF] via-[#00E5FF] to-amber-400 p-0.5 shadow-[0_4px_16px_rgba(124,77,255,0.4)]">
            <div className="w-full h-full rounded-[14px] bg-[#140b28] flex items-center justify-center font-black text-[18px] text-white">
              {settings.branding.logo}
            </div>
          </div>
          <div>
            <h1 className="font-black text-[15px] tracking-tight leading-none text-white">
              {settings.branding.name}
            </h1>
            <p className="text-[10px] text-[#00E5FF] font-bold tracking-widest mt-0.5">
              {settings.branding.tagline}
            </p>
          </div>
        </div>

        {/* User Coins, Lucky Wheel & Admin Panel */}
        <div className="flex items-center gap-1.5">
          {/* Admin Panel Button */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center justify-center active:scale-90 transition shadow-[0_0_10px_rgba(255,215,0,0.3)]"
              title="এডমিন ও রিসেলার প্যানেল (সব সেটিংস পরিবর্তন)"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}

          {/* Daily Spin Trigger */}
          <button
            onClick={() => setShowLuckyWheel(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center text-[15px] shadow-[0_0_12px_rgba(255,215,0,0.5)] active:scale-90 transition"
            title="দৈনিক লাকি স্পিন হুইল"
          >
            🎡
          </button>

          {/* Coins Badge */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-1 bg-[#1f133d] border border-amber-400/40 rounded-full px-2.5 py-1.5 shadow-md active:scale-95 transition"
          >
            <span className="text-[12px]">🪙</span>
            <span className="text-[12px] font-black text-amber-300">
              {profile.coins >= 1000000 ? (profile.coins / 1000000).toFixed(1) + 'M' : profile.coins.toLocaleString()}
            </span>
          </button>

          {!isLoggedInWithGoogle && (
            <button
              onClick={loginWithGoogle}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-extrabold text-[11px] shadow active:scale-90"
              title="গুগল লগইন"
            >
              লগইন
            </button>
          )}

          <button
            onClick={() => setShowRankingModal(true)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 active:scale-95 transition"
            title="শীর্ষ র‍্যাঙ্কিং"
          >
            <Trophy className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-md w-full mx-auto">
        {activeTab === 'rooms' && (
          <div className="pb-24 px-4 pt-3 space-y-4">
            {/* Live Party Hero Feature */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-[#7C4DFF]/60 via-[#00E5FF]/40 to-amber-400/60 shadow-xl overflow-hidden">
              <div className="rounded-[23px] bg-gradient-to-br from-[#25154d] via-[#1a0f38] to-[#100828] p-4 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-300 font-extrabold mb-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    লাইভ ভয়েস আড্ডা ও পিকে
                  </div>
                  <h2 className="text-[19px] font-black leading-tight text-white">
                    বন্ধুদের সাথে কথা বলুন <br />
                    ও গেমসে কয়েন জিতুন 🔥
                  </h2>
                  <p className="text-[11px] text-white/60 mt-1">
                    {settings.games.filter((g) => g.enabled).map((g) => g.title).join(' • ')}
                  </p>
                </div>

                <button
                  onClick={() => setActiveRoom(rooms[0])}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#00E5FF] flex flex-col items-center justify-center text-[26px] shadow-[0_4px_20px_rgba(124,77,255,0.5)] active:scale-90 transition shrink-0 z-10"
                >
                  🎙️
                  <span className="text-[9px] font-black text-black">যোগ দিন</span>
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowCreateRoom(true)}
                className="py-3 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-black text-[13px] flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                নতুন রুম তৈরি
              </button>

              <button
                onClick={() => setShowLuckyWheel(true)}
                className="py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-neutral-900" />
                লাকি হুইল স্পিন 🎡
              </button>
            </div>

            {/* Daily Gifting & Receiving Leaderboard Header (As requested by user!) */}
            <DailyLeaderboardHeader />

            {/* Search Input */}
            <div className="h-11 rounded-2xl bg-white/[0.05] border border-white/10 px-3.5 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রুমের নাম বা হোস্ট খুঁজুন..."
                className="flex-1 bg-transparent text-[13px] outline-none text-white placeholder:text-white/30"
              />
            </div>

            {/* Category Filter Chips (Configured in Admin Settings) */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-extrabold whitespace-nowrap transition active:scale-95 border ${
                    selectedCategory === cat
                      ? 'bg-[#7C4DFF] border-[#7C4DFF] text-white shadow-[0_0_12px_rgba(124,77,255,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'সব রুম ✨' : `#${cat}`}
                </button>
              ))}
            </div>

            {/* Rooms List Cards */}
            <div className="space-y-3">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className="w-full text-left rounded-3xl bg-[#17102e] border border-white/[0.08] p-3.5 flex gap-3.5 hover:border-white/20 active:scale-[0.98] transition group shadow-md"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${room.bgGradient || 'from-purple-600 to-indigo-700'} flex items-center justify-center text-[30px] shrink-0 relative shadow`}
                  >
                    <span>{room.hostAvatar}</span>
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#17102e] shadow-sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <h3 className="font-extrabold text-[15px] truncate text-white group-hover:text-[#00E5FF] transition">
                          {room.title}
                        </h3>
                        {room.hostId === profile.uid && (
                          <span className="text-[9px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-black shrink-0 shadow">
                            আমার রুম 👑
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3 text-emerald-400" />
                        {room.participantsCount}/12
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[12px] text-white/60">
                      <span>হোস্ট: {room.hostName}</span>
                      <span>•</span>
                      <span className="text-[#00E5FF] font-semibold text-[11px] bg-[#00E5FF]/10 px-2 py-0.5 rounded-full border border-[#00E5FF]/20">
                        #{room.topic}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        রিয়েল ইউজার আড্ডা
                      </div>
                      <span className="text-[11px] font-extrabold text-amber-300">
                        যোগ দিন ▶
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {filteredRooms.length === 0 && (
                <div className="py-16 text-center text-white/50 text-[14px]">
                  কোনো রুম খুঁজে পাওয়া যায়নি
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'games' && <GameHub />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      {/* Bottom Main Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#120a22]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-2 flex justify-around max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition ${
            activeTab === 'rooms' ? 'text-white' : 'text-white/40'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'rooms' ? 'bg-[#7C4DFF] shadow-[0_0_15px_rgba(124,77,255,0.4)]' : ''}`}>
            <Radio className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold">ভয়েস রুম</span>
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition ${
            activeTab === 'games' ? 'text-white' : 'text-white/40'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'games' ? 'bg-[#7C4DFF] shadow-[0_0_15px_rgba(124,77,255,0.4)]' : ''}`}>
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold">গেমস</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition ${
            activeTab === 'wallet' ? 'text-white' : 'text-white/40'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'wallet' ? 'bg-[#7C4DFF] shadow-[0_0_15px_rgba(124,77,255,0.4)]' : ''}`}>
            <Coins className="w-5 h-5 text-amber-300" />
          </div>
          <span className="text-[11px] font-bold">ওয়ালেট</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition ${
            activeTab === 'profile' ? 'text-white' : 'text-white/40'
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'profile' ? 'bg-[#7C4DFF] shadow-[0_0_15px_rgba(124,77,255,0.4)]' : ''}`}>
            <User className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold">প্রোফাইল</span>
        </button>
      </nav>

      {/* CREATE ROOM MODAL */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-gradient-to-b from-[#23184d] to-[#120a2e] rounded-t-[32px] sm:rounded-3xl border-t sm:border border-white/20 p-5 shadow-2xl text-white animate-in space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-[17px] text-amber-300">
                নতুন ভয়েস রুম তৈরি করুন 🎙️
              </h3>
              <button
                onClick={() => setShowCreateRoom(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[12px] font-bold text-white/70 block mb-1">
                রুমের নাম / টাইটেল
              </label>
              <input
                type="text"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                maxLength={40}
                placeholder="যেমন: রাতের আড্ডা ও গেমস 🎮"
                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-3 font-semibold text-[14px] outline-none focus:border-[#7C4DFF]"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold text-white/70 block mb-1">
                টপিক / ক্যাটাগরি
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.roomSettings.categories.map((tpc) => (
                  <button
                    key={tpc}
                    onClick={() => setNewRoomTopic(tpc)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border transition ${
                      newRoomTopic === tpc
                        ? 'bg-[#7C4DFF] border-white text-white shadow'
                        : 'bg-white/10 border-white/10 text-white/70'
                    }`}
                  >
                    #{tpc}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-300" />
                <span className="text-[13px] font-bold">প্রাইভেট রুম (লক করা)</span>
              </div>
              <button
                onClick={() => setIsPrivateRoom((p) => !p)}
                className={`w-11 h-6 rounded-full transition-all relative ${
                  isPrivateRoom ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    isPrivateRoom ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-[13px]"
              >
                বাতিল
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomTitle.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white font-black text-[13px] shadow-lg disabled:opacity-40 active:scale-95"
              >
                লাইভ চালু করুন 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN & RESELLER COMPLETE SETTINGS MODAL */}
      {showAdminPanel && (
        <AdminPanelModal onClose={() => setShowAdminPanel(false)} />
      )}

      {/* TOP 3 RANKING MODAL */}
      {showRankingModal && (
        <GameRankingModal
          gameTitle="সর্বজনীন চ্যাম্পিয়ন লিডারবোর্ড"
          onClose={() => setShowRankingModal(false)}
        />
      )}

      {/* DAILY LUCKY WHEEL MODAL */}
      {showLuckyWheel && (
        <DailyLuckyWheelModal onClose={() => setShowLuckyWheel(false)} />
      )}

      {/* ANY USER PROFILE MODAL */}
      {inspectUserModal && (
        <UserProfileModal
          user={inspectUserModal}
          onClose={() => setInspectUserModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
