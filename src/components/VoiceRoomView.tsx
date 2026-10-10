import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Gift,
  Gamepad2,
  Send,
  Users,
  Crown,
  Sparkles,
  Coins,
  Swords,
  X,
  Plus,
  Volume2,
  Lock,
  Smile,
  Megaphone,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, GIFTS_CATALOG } from '../context/AuthContext';
import { VoiceRoom, VoiceRoomSeat, RoomMessage, GiftItem } from '../types';
import { GiftingModal } from './GiftingModal';
import { UserProfileModal } from './UserProfileModal';
import { OriginalGameEmbed } from './games/OriginalGameEmbed';
import { VoiceChatEngine, PeerAudioStatus } from '../utils/voiceChatEngine';
import { PkBattleOverlay } from './PkBattleOverlay';
import { VIP_FRAMES } from './VipFrameModal';
import { sound } from '../utils/sound';

interface VoiceRoomViewProps {
  room: VoiceRoom;
  onLeave: () => void;
}

// Visual avatar presets matching popular voice rooms
const DEFAULT_ROOM_PARTICIPANTS = [
  { name: 'joya', avatar: '👸', frame: 'floral', giftValue: '8.0K', level: 24 },
  { name: 'SHAAN 🎤', avatar: '🤴', frame: 'svip', giftValue: '18.2K', level: 45 },
  { name: 'MR EM...', avatar: '😎', frame: 'gold', giftValue: '45.1K', level: 36 },
  { name: 'অনুভবে তু...', avatar: '🧕', frame: 'angel', giftValue: '8.0K', level: 21 },
  { name: 'BADH...', avatar: '🤠', frame: 'cyber', giftValue: '8.0K', level: 19 },
  { name: 'Spicy 🌶️', avatar: '💎', frame: 'flame', giftValue: '202.2K', level: 41 },
  { name: 'প্রিয় 🌶️', avatar: '🌹', frame: 'gold', giftValue: '8.6K', level: 28 },
  { name: 'রুপকথা', avatar: '🧚', frame: 'floral', giftValue: '25.9K', level: 33 },
  { name: 'MITU 🌸', avatar: '💃', frame: 'angel', giftValue: '19.2K', level: 25 },
  { name: 'Miraz', avatar: '🎧', frame: 'cyber', giftValue: '25.9K', level: 30 },
  { name: 'বউ...', avatar: '👰', frame: 'floral', giftValue: '8.6K', level: 22 },
  { name: 'মেগল...', avatar: '🦁', frame: 'dragon', giftValue: '18.7K', level: 35 },
  { name: 'Israt Ja...', avatar: '🧕', frame: 'angel', giftValue: '8.0K', level: 20 },
  { name: 'Zerin 🌼', avatar: '👸', frame: 'gold', giftValue: '16.6K', level: 27 },
  { name: 'VHIRA **', avatar: '💎', frame: 'gold', giftValue: '8.6K', level: 32 },
  { name: 'Shemul', avatar: '👑', frame: 'svip', giftValue: '8.5K', level: 29 },
  { name: 'MAYA', avatar: '💃', frame: 'flame', giftValue: '8.0K', level: 26 },
  { name: 'Riya Mo?', avatar: '🌸', frame: 'angel', giftValue: '8.5K', level: 23 },
];

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({ room, onLeave }) => {
  const { profile, currentUser } = useAuth();
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [realMicVolume, setRealMicVolume] = useState<number>(0);
  const [showPkBattle, setShowPkBattle] = useState<boolean>(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'All' | 'Chat' | 'Gift'>('All');

  // Seat capacity selector: 8, 10, 15, or 20 seats (matching screenshot's 20-seat grid)
  const [seatCount, setSeatCount] = useState<number>(20);
  const [showSeatSelector, setShowSeatSelector] = useState<boolean>(false);

  // Big Gift Announcement
  const [bigGiftAnnouncement, setBigGiftAnnouncement] = useState<{
    senderName: string;
    recipientName: string;
    gift: GiftItem;
    count: number;
  } | null>(null);

  // Active VIP Frame
  const [activeFrameId] = useState<string>(() => {
    return localStorage.getItem('active_vip_frame') || 'gold';
  });
  const currentFrame = VIP_FRAMES.find((f) => f.id === activeFrameId) || VIP_FRAMES[0];

  const isCreatedByMe = room.hostId === profile.uid;

  // Initialize clean seats: Host at Seat 0, others clean for real joining or sample if joined
  const [seats, setSeats] = useState<VoiceRoomSeat[]>(Array.from({length:20},(_,seatIndex)=>({seatIndex,user:null,isMuted:true,isSpeaking:false})));
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  useEffect(() => {
    if(!currentUser) return;
    return onSnapshot(collection(db, 'rooms', room.id, 'presence'), snap => {
      const peers = snap.docs.filter(d => !d.data().updatedAt || Date.now()-d.data().updatedAt.toMillis()<90000)
        .sort((a,b)=>a.id===room.hostId?-1:b.id===room.hostId?1:a.id.localeCompare(b.id));
      setSeats(Array.from({length:20},(_,seatIndex)=>{
        const peer=peers[seatIndex], data=peer?.data();
        return {seatIndex,user:peer?{uid:peer.id,displayName:data.name||'Player',avatarUrl:data.avatar||'😎',level:1}:null,isMuted:peer?.id===profile.uid?!isMicOn:true,isSpeaking:false,isHost:peer?.id===room.hostId};
      }));
      const index=peers.findIndex(d=>d.id===profile.uid);setMySeatIndex(index>=0&&index<20?index:null);
    }, console.warn);
  }, [room.id, currentUser?.uid, profile.uid, isMicOn]);

  const [chatInput, setChatInput] = useState<string>('');
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<Set<string>>(new Set());
  const [flyingGifts, setFlyingGifts] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Modals & Drawers
  const [giftingTarget, setGiftingTarget] = useState<{ uid: string; displayName: string; avatarUrl: string } | null>(null);
  const [inspectedUser, setInspectedUser] = useState<{ uid: string; displayName: string; avatarUrl: string; level?: number; receivedGifts?: Record<string, number> } | null>(null);
  const [activeOriginalGame, setActiveOriginalGame] = useState<{ path: string; title: string } | null>(null);
  const [showGamesDrawer, setShowGamesDrawer] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const voiceChatEngineRef = useRef<VoiceChatEngine | null>(null);

  // WebRTC P2P Voice Engine Initialization
  useEffect(() => {
    const chatEngine = new VoiceChatEngine(room.id, profile.uid, profile.displayName);
    voiceChatEngineRef.current = chatEngine;

    chatEngine.setCallbacks(
      (localVol) => {
        setRealMicVolume(localVol);
        if (localVol > 12) {
          setActiveSpeakerIds((prev) => new Set([...prev, profile.uid]));
        } else {
          setActiveSpeakerIds((prev) => {
            if (!prev.has(profile.uid)) return prev;
            const next = new Set(prev);
            next.delete(profile.uid);
            return next;
          });
        }
      },
      (peerMap) => {
        const speaking = new Set<string>();
        peerMap.forEach((status, uid) => {
          if (status.isSpeaking && status.volume > 10) {
            speaking.add(uid);
          }
        });
        if (realMicVolume > 12 && isMicOn) {
          speaking.add(profile.uid);
        }
        setActiveSpeakerIds(speaking);
      }
    );

    if (isMicOn && mySeatIndex !== null) {
      chatEngine.startMicrophone();
    } else {
      chatEngine.setMute(true);
    }

    return () => {
      chatEngine.destroy();
    };
  }, [room.id, profile.uid, profile.displayName]);

  useEffect(() => {
    if (voiceChatEngineRef.current) {
      if (isMicOn && mySeatIndex !== null) {
        voiceChatEngineRef.current.setMute(false);
        void voiceChatEngineRef.current.startMicrophone().then(ok => { if(!ok) { setIsMicOn(false); alert('মাইক চালু করা যায়নি। লগইন ও মাইক্রোফোন অনুমতি চেক করুন।'); } });
      } else {
        voiceChatEngineRef.current.setMute(true);
      }
    }
  }, [isMicOn, mySeatIndex]);

  // Realtime Firestore listener for room messages
  useEffect(() => {
    try {
      const messagesRef = collection(db, 'rooms', room.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: RoomMessage[] = [];
            snapshot.forEach((d) => {
              list.unshift({ id: d.id, ...(d.data() as any) });
            });
            setMessages((prev) => {
              const seen = new Set(prev.map((m) => m.id));
              const fresh = list.filter((m) => !seen.has(m.id));
              return [...prev, ...fresh];
            });
          }
        },
        (err) => {
          console.warn('Live messages onSnapshot note:', err);
        }
      );

      return () => unsubscribe();
    } catch {}
  }, [room.id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentUser) { alert('মেসেজ পাঠাতে লগইন করুন।'); return; }
    if (!chatInput.trim()) return;
    const msgId = 'msg_' + Date.now();
    const newMsg: RoomMessage = {
      id: msgId,
      roomId: room.id,
      userId: profile.uid,
      userName: profile.displayName,
      userAvatar: profile.avatarUrl,
      text: chatInput.trim(),
      type: 'chat',
      createdAt: new Date().toISOString(),
    };



    if (currentUser) {
      try {
        await setDoc(doc(db, 'rooms', room.id, 'messages', msgId), newMsg);
        setChatInput('');
      } catch (err) {
        console.warn('Firestore message write error:', err);
        alert('মেসেজ পাঠানো যায়নি।');
      }
    }
  };

  const handleSeatClick = (seatIdx: number) => {
    const seat = seats[seatIdx];

    if (!seat.user) {
      if(!currentUser) { alert('ভয়েসে যোগ দিতে লগইন করুন।'); return; }
      if(mySeatIndex === null) { alert('আপনার আসন প্রস্তুত হচ্ছে বা রুম পূর্ণ।'); return; }
      setIsMicOn(true);
    } else if (seat.user.uid === profile.uid) {
      // Toggle microphone on own seat
      setIsMicOn((m) => !m);
      sound.tick();
    } else {
      // Clicked on another user: Open their full profile showing their gifts, frames & follow!
      setInspectedUser({
        uid: seat.user.uid,
        displayName: seat.user.displayName,
        avatarUrl: seat.user.avatarUrl,
        level: seat.user.level,
      });
    }
  };

  const handleGiftSent = (gift: GiftItem, count: number) => {
    const isBigGift = gift.price >= 500;
    const recipientName = giftingTarget ? giftingTarget.displayName : room.hostName;

    if (isBigGift) {
      sound.bigJackpot();
      setBigGiftAnnouncement({
        senderName: profile.displayName,
        recipientName,
        gift,
        count,
      });
      setTimeout(() => setBigGiftAnnouncement(null), 4000);
    }

    const id = Date.now().toString();
    setFlyingGifts((prev) => [
      ...prev,
      { id, emoji: gift.emoji, x: 20 + Math.random() * 60 },
    ]);
    setTimeout(() => {
      setFlyingGifts((prev) => prev.filter((g) => g.id !== id));
    }, 2200);

    const giftMsg: RoomMessage = {
      id: Date.now().toString(),
      roomId: room.id,
      userId: profile.uid,
      userName: profile.displayName,
      userAvatar: profile.avatarUrl,
      text: `${profile.displayName} ${recipientName}-কে ${count}x ${gift.emoji} ${gift.nameBn} উপহার দিয়েছেন!`,
      type: 'gift',
      giftEmoji: gift.emoji,
      createdAt: 'এখন',
    };
    setMessages((prev) => [...prev, giftMsg]);

    if (currentUser) {
      setDoc(doc(db, 'rooms', room.id, 'messages', giftMsg.id), giftMsg).catch(() => {});
    }
  };

  if (activeOriginalGame) {
    return (
      <OriginalGameEmbed
        gamePath={activeOriginalGame.path}
        title={activeOriginalGame.title}
        onBack={() => setActiveOriginalGame(null)}
      />
    );
  }

  const displayedSeats = seats.slice(0, seatCount);

  return (
    <div className="h-screen min-h-[100dvh] w-full max-w-md mx-auto relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#251347] via-[#160b2f] to-[#0a0518] text-white select-none shadow-2xl">
      {/* Background Starry Bokeh Lights */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-700/30 via-transparent to-transparent" />

      {/* TOP HEADER (Exact pill layout from screenshot) */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between z-20">
        {/* Left Room Capsule Pill */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/15 backdrop-blur-md rounded-full py-1 pl-1 pr-3 shadow-lg">
          <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow shrink-0">
            <div className="w-full h-full rounded-full bg-[#180e30] flex items-center justify-center text-[18px]">
              {room.hostAvatar || '👑'}
            </div>
          </div>
          <div className="min-w-0 pr-1">
            <h2 className="font-extrabold text-[13px] leading-tight text-white truncate max-w-[110px]">
              {room.title || 'অফিসিয়াল রুম'}
            </h2>
            <p className="text-[10px] text-white/50 leading-none mt-0.5">ID:{room.id}</p>
          </div>
          <button
            onClick={() => sound.tick()}
            className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#7C4DFF] text-black font-black flex items-center justify-center text-[13px] active:scale-90 shadow"
            title="ফলো করুন"
          >
            +
          </button>
        </div>

        {/* Right Close Button */}
        <button
          onClick={onLeave}
          className="w-8 h-8 rounded-full bg-black/40 border border-white/20 hover:bg-white/10 flex items-center justify-center text-white/80 active:scale-90 transition shadow"
          title="রুম থেকে বের হন"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* HOTNESS CAPSULE & AUDIENCE AVATARS ROW (Exact from screenshot) */}
      <div className="px-3 py-1 flex items-center justify-between z-20">
        {/* Left Gold Hotness Pill */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-amber-400/50 rounded-full px-3 py-1 shadow-[0_0_15px_rgba(251,191,36,0.25)] text-amber-300 font-black text-[12px]">
          <span className="text-[13px]">🏆</span>
          <span>57.63M</span>
          <span className="text-[10px] text-amber-200/80">&gt;</span>
        </div>

        {/* Right Top Contributor Avatars & Viewer Count */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center -space-x-1.5">
            {['🤴', '💃', '💎', '🌹', '🤠'].map((av, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full border border-amber-300/80 bg-[#1e113a] flex items-center justify-center text-[12px] shadow"
              >
                {av}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-extrabold bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-white/70">
            20
          </span>
        </div>
      </div>

      {/* BIG GIFT FULLSCREEN BANNER */}
      {bigGiftAnnouncement && (
        <div className="absolute top-16 left-3 right-3 z-50 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 p-2.5 rounded-2xl border-2 border-white shadow-[0_0_50px_#ffb300] flex items-center gap-2.5 animate-in">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-amber-600 flex items-center justify-center text-[30px] shadow shrink-0">
            {bigGiftAnnouncement.gift.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black tracking-widest uppercase bg-black text-amber-300 px-2 py-0.2 rounded-full inline-block mb-0.5">
              👑 LUXURY GIFT
            </span>
            <p className="font-black text-[12px] truncate">
              {bigGiftAnnouncement.senderName} ➔ {bigGiftAnnouncement.recipientName}
            </p>
            <p className="text-[11px] font-extrabold text-amber-950">
              {bigGiftAnnouncement.count}x {bigGiftAnnouncement.gift.nameBn} (🪙{' '}
              {(bigGiftAnnouncement.gift.price * bigGiftAnnouncement.count).toLocaleString()})
            </p>
          </div>
        </div>
      )}

      {/* SPEAKER SEATS GRID (5 columns x 4 rows = 20 seats matching screenshot!) */}
      <div className="px-2.5 py-1 flex-1 overflow-y-auto scrollbar-hide">
        <div
          className={`grid gap-x-1 gap-y-2 max-w-sm mx-auto ${
            seatCount === 8 ? 'grid-cols-4' : seatCount === 10 ? 'grid-cols-5' : 'grid-cols-5'
          }`}
        >
          {displayedSeats.map((seat, idx) => {
            const hasUser = seat.user !== null;
            const isMe = hasUser && seat.user?.uid === profile.uid;
            const isSpeaking =
              hasUser &&
              (isMe ? isMicOn && realMicVolume > 12 : activeSpeakerIds.has(seat.user?.uid || ''));

            const giftBadge = isMe ? Object.values(profile.receivedGifts || {}).reduce((a,b)=>a+b,0).toString() : '—';

            return (
              <button
                key={idx}
                onClick={() => handleSeatClick(idx)}
                className="flex flex-col items-center gap-0.5 group active:scale-95 transition"
              >
                <div className="relative">
                  {/* Real-time WebRTC Speaking Halo Wave */}
                  {isSpeaking && (
                    <>
                      <span className="absolute -inset-1.5 rounded-full border-2 border-[#00E5FF] animate-ping opacity-75 pointer-events-none" />
                      <span className="absolute -inset-1 rounded-full border-2 border-amber-300 animate-pulse pointer-events-none" />
                    </>
                  )}

                  {/* Circular Avatar with VIP Frame */}
                  <div
                    className={`rounded-full flex items-center justify-center relative transition-all duration-150 border-2 w-13 h-13 text-[26px] ${
                      hasUser
                        ? isMe
                          ? `${currentFrame.borderClass} ${currentFrame.glowClass} bg-[#180e30]`
                          : isSpeaking
                          ? 'border-[#00E5FF] bg-gradient-to-br from-[#28174f] to-[#120826] shadow-[0_0_15px_rgba(0,229,255,0.6)]'
                          : 'border-amber-300/80 bg-gradient-to-br from-[#20133e] to-[#110724] shadow-md'
                        : 'border-white/15 bg-white/[0.04] text-white/30 hover:border-white/40'
                    }`}
                  >
                    {hasUser ? (
                      <>
                        {seat.isHost && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow z-10">
                            <Crown className="w-2.5 h-2.5 text-black" />
                          </div>
                        )}
                        <span>{seat.user?.avatarUrl}</span>

                        {/* Mic Status Badge at bottom-right of circle */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] border shadow ${
                            seat.isMuted
                              ? 'bg-neutral-900 border-white/20 text-white/40'
                              : isSpeaking
                              ? 'bg-emerald-500 border-white text-black animate-pulse'
                              : 'bg-emerald-950 border-emerald-400 text-emerald-400'
                          }`}
                        >
                          {seat.isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                        </div>
                      </>
                    ) : (
                      // Empty Seat: Lock or plus with Seat number
                      <div className="flex flex-col items-center justify-center text-white/40">
                        {idx === 7 ? (
                          <Lock className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <span className="text-[14px] font-thin">+</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Name & Gift Value Badge (Exact from screenshot) */}
                <div className="text-center w-full max-w-[62px]">
                  <p className="text-[10px] font-extrabold truncate text-white leading-tight">
                    {hasUser ? (isMe ? 'আপনি' : seat.user?.displayName) : `No.${idx + 1}`}
                  </p>
                  {hasUser && (
                    <div className="inline-flex items-center gap-0.5 bg-gradient-to-r from-purple-900/90 to-indigo-950/90 border border-purple-500/40 rounded-full px-1.5 py-0.2 text-[8px] font-black text-amber-300 shadow-sm mt-0.5">
                      <span>🎁</span>
                      <span>{giftBadge}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Animated Gifts Layer */}
      <div className="pointer-events-none absolute bottom-48 left-0 right-0 h-64 overflow-hidden z-30">
        {flyingGifts.map((fg) => (
          <div
            key={fg.id}
            style={{
              left: `${fg.x}%`,
              animation: 'float-up 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            }}
            className="absolute bottom-0 text-[40px] filter drop-shadow-[0_4px_10px_rgba(255,215,0,0.6)]"
          >
            {fg.emoji}
          </div>
        ))}
      </div>

      {/* MIDDLE SECTION: TABS & CP LOVE BANNER & FLOATING GAMES WIDGET */}
      <div className="px-3 py-1 space-y-1.5 z-20">
        <div className="flex items-center justify-between">
          {/* Tab filter: All, Chat, Gift (from screenshot) */}
          <div className="flex gap-3 text-[12px] font-black">
            {(['All', 'Chat', 'Gift'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTabFilter(tab)}
                className={`transition ${
                  activeTabFilter === tab ? 'text-white border-b-2 border-amber-300 pb-0.5' : 'text-white/40'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Seat Capacity Selector Button */}
          <button
            onClick={() => setShowSeatSelector((s) => !s)}
            className="text-[10px] bg-black/40 border border-white/15 px-2 py-0.5 rounded-full text-amber-300 font-bold flex items-center gap-1"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>{seatCount} সিট</span>
          </button>
        </div>

        {showSeatSelector && (
          <div className="flex gap-2 bg-[#1b0e36] p-1.5 rounded-xl border border-amber-400/50 text-[11px] font-bold">
            {[8, 10, 15, 20].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setSeatCount(cnt);
                  setShowSeatSelector(false);
                }}
                className={`flex-1 py-1 rounded-lg ${
                  seatCount === cnt ? 'bg-amber-400 text-black font-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {cnt} সিট
              </button>
            ))}
          </div>
        )}

        {/* CP Party Banner & Floating Game Widget (Exact from screenshot) */}
        <div className="flex items-center gap-2">
          {/* CP banner */}
          <div className="flex-1 h-9 rounded-2xl bg-gradient-to-r from-rose-600/80 via-red-500/80 to-amber-500/80 border border-amber-300/40 px-3 flex items-center justify-between shadow-lg">
            <span className="text-[11px] font-black tracking-wide text-white flex items-center gap-1">
              ❤️ Spicy CP Party ❤️
            </span>
            <span className="text-[10px] font-extrabold text-amber-200">LV.10</span>
          </div>

          {/* Floating Games Widget on the Right (as shown in screenshot) */}
          <button
            onClick={() => setShowGamesDrawer(true)}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(124,77,255,0.6)] animate-pulse shrink-0 active:scale-95"
            title="গেমস খেলুন"
          >
            <div className="w-full h-full rounded-[14px] bg-[#1a0c36] flex items-center justify-center text-[20px]">
              🎮
            </div>
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES STREAM */}
      <div
        ref={chatScrollRef}
        className="px-3 py-1 flex-1 max-h-36 overflow-y-auto space-y-1.5 scrollbar-hide text-[12px] z-20"
      >
        {messages.map((msg) => {
          const isGift = msg.type === 'gift';
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="bg-black/40 border border-white/10 text-white/70 text-[10px] py-0.5 px-2.5 rounded-full w-fit"
              >
                {msg.text}
              </div>
            );
          }

          if (isGift) {
            return (
              <div
                key={msg.id}
                className="bg-gradient-to-r from-amber-500/25 to-purple-600/25 border border-amber-400/40 text-amber-200 text-[11px] font-bold py-1 px-3 rounded-2xl w-fit flex items-center gap-1.5 shadow"
              >
                <span className="text-[14px]">{msg.giftEmoji || '🎁'}</span>
                <span>{msg.text}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-1.5 leading-snug">
              <button
                onClick={() =>
                  setInspectedUser({
                    uid: msg.userId,
                    displayName: msg.userName,
                    avatarUrl: msg.userAvatar,
                  })
                }
                className="font-black text-amber-300 hover:underline shrink-0"
              >
                {msg.userName}:
              </button>
              <span className="text-white/90 break-words">{msg.text}</span>
            </div>
          );
        })}
      </div>

      {/* BOTTOM CONTROLS DOCK (Exact from screenshot) */}
      <div className="p-3 bg-[#110724]/95 backdrop-blur-2xl border-t border-white/10 space-y-2 z-20">
        <div className="flex items-center gap-2">
          {/* Chat Input Pill: "Say something..." */}
          <div className="flex-1 h-10 rounded-full bg-white/[0.08] border border-white/15 px-3 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Say something..."
              className="flex-1 bg-transparent text-[12px] outline-none text-white placeholder:text-white/40"
            />
            <button
              onClick={handleSendMessage}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-90"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Emoji Sticker Button 😊 */}
          <button
            onClick={() => setShowEmojiPicker((s) => !s)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[18px] active:scale-90"
            title="ইমোজি"
          >
            😊
          </button>

          {/* Horn / Megaphone Button 📢 */}
          <button
            onClick={() => {
              setChatInput('📢 রুমে সবাই স্বাগতম!');
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 active:scale-90"
            title="ঘোষণা"
          >
            <Megaphone className="w-4 h-4" />
          </button>

          {/* WebRTC P2P Mic Toggle Button 🎤 */}
          <button
            onClick={() => {
              setIsMicOn((m) => !m);
              sound.tick();
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 shadow-md ${
              isMicOn
                ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.6)]'
                : 'bg-white/10 text-white/50 border border-white/10'
            }`}
            title={isMicOn ? 'মাইক্রোফোন বন্ধ' : 'মাইক্রোফোন চালু'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Games Button 🎮 */}
          <button
            onClick={() => setShowGamesDrawer(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-lg active:scale-90"
            title="গেমস খেলুন"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>

          {/* Luxury 3D Gift Box Button 🎁 (Pink/Purple gradient gift box from screenshot) */}
          <button
            onClick={() => {
              setGiftingTarget({
                uid: room.hostId,
                displayName: room.hostName,
                avatarUrl: room.hostAvatar,
              });
            }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-0.5 shadow-[0_4px_20px_rgba(244,63,94,0.6)] active:scale-90 animate-pulse"
            title="উপহার পাঠান"
          >
            <div className="w-full h-full rounded-[14px] bg-[#1a0930] flex items-center justify-center text-[22px]">
              🎁
            </div>
          </button>
        </div>

        {/* Quick Emoji Bar when clicked */}
        {showEmojiPicker && (
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
            {['❤️', '🔥', '👏', '🎉', '🌹', '💯', '🤣', '⭐'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setChatInput((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[18px] active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* QUICK GAMES DRAWER (Plays the 4 100% Original HTML Games with 5s Loading Screen) */}
      {showGamesDrawer && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="w-full max-w-md bg-gradient-to-b from-[#24154a] to-[#0f0724] rounded-t-[32px] border-t-2 border-amber-400/80 p-5 shadow-2xl text-white animate-in">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-[16px] text-amber-300">রুমেই গেমস খেলুন 🎮</h3>
              </div>
              <button
                onClick={() => setShowGamesDrawer(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <button
                onClick={() => {
                  setShowGamesDrawer(false);
                  setActiveOriginalGame({ path: '/games/jackpot_fruit.html', title: 'জ্যাকপট ফ্রুট' });
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#4d1447] to-[#120224] border-2 border-amber-400 text-left flex flex-col justify-between h-28 shadow-lg active:scale-95"
              >
                <div className="text-[28px]">🍓 🍒</div>
                <div>
                  <h4 className="font-bold text-[14px] leading-tight text-amber-300">জ্যাকপট ফ্রুট</h4>
                  <span className="text-[10px] text-white/60">অরিজিনাল জ্যাকপট গেম</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowGamesDrawer(false);
                  setActiveOriginalGame({ path: '/games/night_food.html', title: 'নাইট ফুড হুইল' });
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#4a1450] to-[#120620] border-2 border-amber-400/60 text-left flex flex-col justify-between h-28 shadow-lg active:scale-95"
              >
                <div className="text-[28px]">🌙 🌭</div>
                <div>
                  <h4 className="font-bold text-[14px] leading-tight">নাইট ফুড হুইল</h4>
                  <span className="text-[10px] text-amber-300">x45 পর্যন্ত জয়</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowGamesDrawer(false);
                  setActiveOriginalGame({ path: '/games/lion_food.html', title: 'সিংহ ফুড হুইল' });
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0b648c] to-[#042033] border-2 border-amber-400/60 text-left flex flex-col justify-between h-28 shadow-lg active:scale-95"
              >
                <div className="text-[28px]">🦁 🍗</div>
                <div>
                  <h4 className="font-bold text-[14px] leading-tight">সিংহ ফুড হুইল</h4>
                  <span className="text-[10px] text-amber-300">সিংহ জ্যাকপট</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowGamesDrawer(false);
                  setActiveOriginalGame({ path: '/games/slots.html', title: 'স্লটস (Bonus)' });
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2e1263] to-[#0d0221] border-2 border-amber-400/60 text-left flex flex-col justify-between h-28 shadow-lg active:scale-95"
              >
                <div className="text-[28px]">7️⃣ 🎰</div>
                <div>
                  <h4 className="font-bold text-[14px] leading-tight">স্লটস (Bonus)</h4>
                  <span className="text-[10px] text-amber-300">x70 মাল্টিপ্লায়ার</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIFTING MODAL */}
      {giftingTarget && (
        <GiftingModal
          targetUser={giftingTarget}
          onClose={() => setGiftingTarget(null)}
          onGiftSent={handleGiftSent}
        />
      )}

      {/* USER PROFILE MODAL */}
      {inspectedUser && (
        <UserProfileModal
          user={inspectedUser}
          onClose={() => setInspectedUser(null)}
          onOpenGifting={() => {
            setGiftingTarget(inspectedUser);
            setInspectedUser(null);
          }}
        />
      )}
    </div>
  );
};
