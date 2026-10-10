import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Coins,
  Gamepad2,
  Gift,
  Radio,
  Sparkles,
  Send,
  Users,
  Settings,
  Key,
  Plus,
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAppSettings, GameConfigItem } from '../context/SettingsContext';
import { GiftItem } from '../types';
import { sound } from '../utils/sound';

interface AdminPanelModalProps {
  onClose: () => void;
}

const ROOT_ADMIN_EMAIL = 'soverixnet@gmail.com';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { currentUser, profile, adjustCoins } = useAuth();
  const {
    settings,
    updateBranding,
    updateGame,
    updateRoomSettings,
    updateGift,
    addCustomGift,
    removeGift,
    updatePackages,
    resetToDefaults,
  } = useAppSettings();

  const [activeTab, setActiveTab] = useState<
    'dealer' | 'games' | 'branding' | 'rooms' | 'gifts' | 'packages' | 'admins'
  >('dealer');

  // Coin Transfer
  const [targetUid, setTargetUid] = useState<string>('');
  const [coinAmount, setCoinAmount] = useState<number>(5000000);
  const [transferStatus, setTransferStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Branding Inputs
  const [appName, setAppName] = useState(settings.branding.name);
  const [appTagline, setAppTagline] = useState(settings.branding.tagline);
  const [appLogo, setAppLogo] = useState(settings.branding.logo);
  const [appAnnouncement, setAppAnnouncement] = useState(settings.branding.announcement);

  // New Gift State
  const [showAddGift, setShowAddGift] = useState<boolean>(false);
  const [newGiftName, setNewGiftName] = useState<string>('');
  const [newGiftEmoji, setNewGiftEmoji] = useState<string>('⭐');
  const [newGiftPrice, setNewGiftPrice] = useState<number>(100);

  // Admin Permission Management
  const [newAdminUid, setNewAdminUid] = useState<string>('');
  const [adminList, setAdminList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shakil_admin_uids');
      return saved ? JSON.parse(saved) : [ROOT_ADMIN_EMAIL, profile.uid];
    } catch {
      return [ROOT_ADMIN_EMAIL, profile.uid];
    }
  });

  const isSuperAdmin =
    currentUser?.email === ROOT_ADMIN_EMAIL ||
    adminList.includes(currentUser?.email || '') ||
    adminList.includes(profile.uid);

  const handleSendCoins = async () => {
    if (!targetUid.trim() || coinAmount <= 0) {
      setTransferStatus('দয়া করে সঠিক ইউজার আইডি ও কয়েনের পরিমাণ দিন');
      return;
    }

    setIsProcessing(true);
    setTransferStatus('');

    try {
      if (targetUid === profile.uid || targetUid === 'me') {
        adjustCoins(coinAmount, 0);
      } else {
        const userRef = doc(db, 'users', targetUid.trim());
        await updateDoc(userRef, {
          coins: increment(coinAmount),
        });
      }

      sound.winFanfare();
      setTransferStatus(`✅ সফল! ${coinAmount.toLocaleString()} কয়েন ক্রেডিট করা হয়েছে!`);
      setTimeout(() => setTransferStatus(''), 4000);
    } catch {
      if (targetUid === profile.uid || targetUid === 'me') {
        adjustCoins(coinAmount, 0);
        sound.winFanfare();
        setTransferStatus(`✅ সফল! ${coinAmount.toLocaleString()} কয়েন ক্রেডিট করা হয়েছে!`);
      } else {
        setTransferStatus('⚠️ ইউজার পাওয়া যায়নি অথবা ত্রুটি ঘটেছে।');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveBranding = async () => {
    await updateBranding({
      name: appName,
      tagline: appTagline,
      logo: appLogo,
      announcement: appAnnouncement,
    });
    sound.winFanfare();
    alert('অ্যাপের ব্রান্ডিং ও অ্যানাউন্সমেন্ট সফলভাবে আপডেট হয়েছে!');
  };

  const handleCreateGift = async () => {
    if (!newGiftName.trim() || newGiftPrice <= 0) return;
    const newGift: GiftItem = {
      id: 'g_custom_' + Date.now(),
      name: newGiftName.trim(),
      nameBn: newGiftName.trim(),
      emoji: newGiftEmoji || '🎁',
      price: newGiftPrice,
      color: '#FFB800',
    };
    await addCustomGift(newGift);
    setShowAddGift(false);
    setNewGiftName('');
    setNewGiftPrice(100);
    sound.winFanfare();
  };

  const handleGrantAdmin = (uid: string) => {
    if (!uid.trim()) return;
    const next = Array.from(new Set([...adminList, uid.trim()]));
    setAdminList(next);
    localStorage.setItem('shakil_admin_uids', JSON.stringify(next));
    setNewAdminUid('');
    sound.winFanfare();
  };

  const handleRevokeAdmin = (uid: string) => {
    if (uid === ROOT_ADMIN_EMAIL) return;
    const next = adminList.filter((a) => a !== uid);
    setAdminList(next);
    localStorage.setItem('shakil_admin_uids', JSON.stringify(next));
  };

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1e0f38] border-2 border-rose-500 rounded-3xl p-6 text-center text-white space-y-4 shadow-2xl animate-in">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-[28px]">
            🚫
          </div>
          <h3 className="text-[18px] font-black text-rose-400">অ্যাক্সেস সংরক্ষিত</h3>
          <p className="text-[13px] text-white/70">
            এই এডমিন প্যানেলে শুধুমাত্র মূল এডমিন (<b>{ROOT_ADMIN_EMAIL}</b>) অথবা অনুমোদিত রিসেলাররা প্রবেশ করতে পারেন।
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[13px]"
          >
            ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] bg-gradient-to-b from-[#1e113b] via-[#140b28] to-[#0b0517] rounded-3xl border-2 border-amber-400 p-4 sm:p-5 shadow-[0_0_50px_rgba(255,184,0,0.4)] text-white overflow-hidden flex flex-col animate-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-[16px] text-amber-300 leading-tight">
                সুপার এডমিন কন্ট্রোল সেন্টার 🛡️
              </h3>
              <p className="text-[10px] text-white/50">অ্যাপের সব সেটিংস, লোগো, কয়েন ও রুম পরিবর্তন</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2 border-b border-white/10 text-[11px] font-bold">
          {[
            { id: 'dealer', label: '🪙 কয়েন ডিলার', icon: Coins },
            { id: 'games', label: '🎮 গেমস লোগো', icon: Gamepad2 },
            { id: 'branding', label: '🎨 অ্যাপ ব্রান্ডিং', icon: Sparkles },
            { id: 'rooms', label: '🎙️ ভয়েস রুম', icon: Radio },
            { id: 'gifts', label: '🎁 গিফট ম্যানেজার', icon: Gift },
            { id: 'packages', label: '💳 প্যাকেজ রেট', icon: Coins },
            { id: 'admins', label: '🔑 পারমিশন', icon: Key },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1 ${
                activeTab === t.id
                  ? 'bg-amber-400 text-black font-extrabold shadow'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Coin Dealer */}
        {activeTab === 'dealer' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-2xl text-[12px] text-amber-200">
              💡 <b>রিসেলার ডিলার ট্রান্সফার:</b> যেকোনো ইউজারের অ্যাকাউন্টে কয়েন পাঠান।
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">টার্গেট ইউজার UID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  placeholder="ইউজার আইডি দিন বা 'me' লিখুন..."
                  className="flex-1 h-10 rounded-xl bg-white/10 border border-white/20 px-3 font-mono text-[12px] outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => setTargetUid(profile.uid)}
                  className="px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold whitespace-nowrap"
                >
                  আমার আইডি
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">কয়েনের পরিমাণ</label>
              <div className="grid grid-cols-6 gap-1 mb-2">
                {[1000000, 2500000, 5000000, 10000000, 25000000, 50000000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCoinAmount(amt)}
                    className={`py-1 rounded-xl text-[10px] font-black border transition ${
                      coinAmount === amt
                        ? 'bg-amber-400 text-black border-white shadow'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    {amt >= 1000000 ? (amt / 1000000).toFixed(amt % 1000000 !== 0 ? 1 : 0) + 'M' : amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={coinAmount}
                onChange={(e) => setCoinAmount(Number(e.target.value))}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 font-bold text-[14px] text-amber-300 outline-none focus:border-amber-400"
              />
            </div>

            {transferStatus && (
              <div className="p-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-[12px] font-bold text-center">
                {transferStatus}
              </div>
            )}

            <button
              onClick={handleSendCoins}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-neutral-950 font-black text-[13px] shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{isProcessing ? 'ক্রেডিট হচ্ছে...' : 'কয়েন ক্রেডিট করুন 🚀'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Games Settings & Logos */}
        {activeTab === 'games' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <p className="text-[11px] text-white/50">
              এখান থেকে ৪টি গেমসের লোগো, নাম, ব্যাজ ও বিবরণ সরাসরি পরিবর্তন করুন:
            </p>

            {settings.games.map((game) => (
              <div key={game.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[13px] text-amber-300">{game.id}</span>
                  <button
                    onClick={() => updateGame(game.id, { enabled: !game.enabled })}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      game.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {game.enabled ? 'চালু ✓' : 'বন্ধ ✕'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-white/60 block">লোগো / আইকন</label>
                    <input
                      type="text"
                      defaultValue={game.icon}
                      onBlur={(e) => updateGame(game.id, { icon: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[14px] text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-white/60 block">টাইটেল (নাম)</label>
                    <input
                      type="text"
                      defaultValue={game.title}
                      onBlur={(e) => updateGame(game.id, { title: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[12px] font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/60 block">ব্যাজ টেক্সট</label>
                    <input
                      type="text"
                      defaultValue={game.badge}
                      onBlur={(e) => updateGame(game.id, { badge: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/60 block">বিবরণ (Payout Info)</label>
                    <input
                      type="text"
                      defaultValue={game.payoutDesc}
                      onBlur={(e) => updateGame(game.id, { payoutDesc: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/60 block">ইংরেজি সাবটাইটেল</label>
                    <input
                      type="text"
                      defaultValue={game.titleEn}
                      onBlur={(e) => updateGame(game.id, { titleEn: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/60 block">এমবেড পাথ (HTML URL)</label>
                    <input
                      type="text"
                      defaultValue={game.path}
                      onBlur={(e) => updateGame(game.id, { path: e.target.value })}
                      className="w-full h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[11px] font-mono text-white/70"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: App Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">অ্যাপের নাম (App Name)</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 font-bold text-[13px] outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">ট্যাগলাইন (Subtitle)</label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-[12px] outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">মূল লোগো ক্যারেক্টার / অবতার</label>
              <input
                type="text"
                value={appLogo}
                onChange={(e) => setAppLogo(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-[14px] outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">লাইভ স্ক্রোলিং টিকার অ্যানাউন্সমেন্ট</label>
              <textarea
                value={appAnnouncement}
                onChange={(e) => setAppAnnouncement(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-2.5 text-[12px] outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <button
              onClick={handleSaveBranding}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[13px] shadow active:scale-95"
            >
              ব্রান্ডিং সেভ করুন ✓
            </button>
          </div>
        )}

        {/* Tab 4: Voice Room Settings */}
        {activeTab === 'rooms' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">ডিফল্ট সিট সংখ্যা</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 8, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => updateRoomSettings({ defaultSeatCount: cnt })}
                    className={`py-2 rounded-xl text-[12px] font-black border transition ${
                      settings.roomSettings.defaultSeatCount === cnt
                        ? 'bg-amber-400 text-black border-white shadow'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    {cnt} সিট
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">রুম ওয়েলকাম মেসেজ</label>
              <input
                type="text"
                defaultValue={settings.roomSettings.welcomeMessage}
                onBlur={(e) => updateRoomSettings({ welcomeMessage: e.target.value })}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-[12px]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">টপিক তালিকা (কমা দিয়ে আলাদা করুন)</label>
              <input
                type="text"
                defaultValue={settings.roomSettings.categories.join(', ')}
                onBlur={(e) => {
                  const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  updateRoomSettings({ categories: arr });
                }}
                className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-[12px]"
              />
            </div>
          </div>
        )}

        {/* Tab 5: Gifts Manager */}
        {activeTab === 'gifts' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-white/70">সব গিফটের দাম ও নাম পরিবর্তন:</span>
              <button
                onClick={() => setShowAddGift((s) => !s)}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 text-black font-extrabold text-[11px] flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" /> নতুন গিফট
              </button>
            </div>

            {showAddGift && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newGiftEmoji}
                    onChange={(e) => setNewGiftEmoji(e.target.value)}
                    placeholder="ইমোজি (যেমন: 🦁)"
                    className="h-8 rounded-lg bg-black/40 border border-white/20 text-center text-[16px]"
                  />
                  <input
                    type="text"
                    value={newGiftName}
                    onChange={(e) => setNewGiftName(e.target.value)}
                    placeholder="নাম"
                    className="col-span-2 h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[12px]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newGiftPrice}
                    onChange={(e) => setNewGiftPrice(Number(e.target.value))}
                    placeholder="কয়েন দাম"
                    className="flex-1 h-8 rounded-lg bg-black/40 border border-white/20 px-2 text-[12px] text-amber-300 font-bold"
                  />
                  <button
                    onClick={handleCreateGift}
                    className="px-4 bg-emerald-500 text-black rounded-lg text-[12px] font-extrabold"
                  >
                    যোগ করুন
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {settings.gifts.map((g) => (
                <div
                  key={g.id}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="text-[20px]">{g.emoji}</span>
                  <input
                    type="text"
                    defaultValue={g.name}
                    onBlur={(e) => updateGift(g.id, { name: e.target.value, nameBn: e.target.value })}
                    className="flex-1 h-7 rounded bg-black/40 border border-white/10 px-2 text-[11px] font-bold"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-[10px]">🪙</span>
                    <input
                      type="number"
                      defaultValue={g.price}
                      onBlur={(e) => updateGift(g.id, { price: Number(e.target.value) })}
                      className="w-16 h-7 rounded bg-black/40 border border-white/10 px-1 text-center font-bold text-amber-300 text-[11px]"
                    />
                    <button
                      onClick={() => removeGift(g.id)}
                      className="w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 flex items-center justify-center text-[10px] ml-1 transition"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Packages Config */}
        {activeTab === 'packages' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <p className="text-[11px] text-white/50">
              ওয়ালেটের কয়েন প্যাকেজ রেট ও দাম পরিবর্তন করুন:
            </p>

            {settings.packages.map((pkg, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/60 block">কয়েন সংখ্যা</label>
                    <input
                      type="number"
                      defaultValue={pkg.coins}
                      onBlur={(e) => {
                        const copy = [...settings.packages];
                        copy[idx].coins = Number(e.target.value);
                        updatePackages(copy);
                      }}
                      className="w-full h-7 rounded bg-black/40 border border-white/10 px-2 text-[11px] font-bold text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/60 block">দাম (যেমন: ১০০ টাকা)</label>
                    <input
                      type="text"
                      defaultValue={pkg.price}
                      onBlur={(e) => {
                        const copy = [...settings.packages];
                        copy[idx].price = e.target.value;
                        updatePackages(copy);
                      }}
                      className="w-full h-7 rounded bg-black/40 border border-white/10 px-2 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 7: Admin Permissions */}
        {activeTab === 'admins' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-2 scrollbar-hide">
            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">
                নতুন এডমিন / রিসেলার পারমিশন দিন (Email বা UID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                  placeholder="ইমেইল বা ইউআইডি দিন..."
                  className="flex-1 h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-[12px] outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => handleGrantAdmin(newAdminUid)}
                  className="px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] active:scale-95"
                >
                  অনুমতি দিন
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-white/50 uppercase block">অনুমোদিত এডমিন তালিকা:</span>
              {adminList.map((adm) => (
                <div
                  key={adm}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px]"
                >
                  <span className="font-mono text-amber-200 truncate max-w-[220px]">{adm}</span>
                  {adm !== ROOT_ADMIN_EMAIL ? (
                    <button
                      onClick={() => handleRevokeAdmin(adm)}
                      className="text-rose-400 hover:underline font-bold text-[10px]"
                    >
                      বাতিল
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-extrabold text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      সুপার এডমিন
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10">
              <button
                onClick={resetToDefaults}
                className="w-full py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ফ্যাক্টরি ডিফল্ট সেটিংসে রিসেট করুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
