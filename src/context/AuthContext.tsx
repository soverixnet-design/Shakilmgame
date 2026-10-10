import { callServer } from '../serverApi';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onIdTokenChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment, deleteDoc, collection, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, GiftItem, GameRoundRecord } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  profile: UserProfile;
  isLoggedInWithGoogle: boolean;
  isLoading: boolean;
  followingSet: Set<string>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string, avatarUrl: string, bio?: string) => Promise<void>;
  adjustCoins: (amount: number, wonAmount?: number) => Promise<void>;
  sendGift: (targetUid: string, gift: GiftItem, roomId?: string) => Promise<boolean>;
  toggleFollow: (targetUid: string) => Promise<boolean>;
  saveGameRound: (round: Omit<GameRoundRecord, 'id' | 'createdAt' | 'userId' | 'userName' | 'userAvatar'>) => Promise<void>;
  addDemoCoins: (amount?: number) => void;
}

const DEFAULT_AVATARS = [
  '😎', '🤠', '👸', '🤴', '🦁', '🚀', '🎤', '🌟', '💎', '🔥', '🐯', '🎮'
];

export const GIFTS_CATALOG: GiftItem[] = [
  { id: 'g1', name: 'Golap', nameBn: 'গোলাপ', emoji: '🌹', price: 10, color: '#FF4D6D' },
  { id: 'g2', name: 'Heart', nameBn: 'লাভ', emoji: '💖', price: 50, color: '#FF3B82' },
  { id: 'g3', name: 'Coffee', nameBn: 'কফি', emoji: '☕', price: 30, color: '#D69E2E' },
  { id: 'g4', name: 'Mic', nameBn: 'গোল্ডেন মাইক', emoji: '🎤', price: 100, color: '#7C4DFF' },
  { id: 'g5', name: 'Diamond', nameBn: 'হীরা', emoji: '💎', price: 200, color: '#00E5FF' },
  { id: 'g6', name: 'Car', nameBn: 'স্পোর্টস কার', emoji: '🏎️', price: 500, color: '#FFD60A' },
  { id: 'g7', name: 'Rocket', nameBn: 'রকেট', emoji: '🚀', price: 750, color: '#9B51E0' },
  { id: 'g8', name: 'Crown', nameBn: 'রাজমুকুট', emoji: '👑', price: 1000, color: '#FFB800' },
  { id: 'g9', name: 'Lion', nameBn: 'রয়েল সিংহ', emoji: '🦁', price: 2000, color: '#E67E22' },
  { id: 'g10', name: 'Castle', nameBn: 'রাজপ্রাসাদ', emoji: '🏰', price: 5000, color: '#3498DB' },
];

const INITIAL_PROFILE: UserProfile = {
  uid: 'guest_shakil_' + Math.random().toString(36).substring(2, 8),
  displayName: 'Shakil Player',
  avatarUrl: '😎',
  bio: 'ভয়েস রুমে আড্ডা ও গেমস ভালোবাসি! 🎮🎤',
  coins: 0, // 10 Lakh starting demo coins as in the templates
  totalWon: 0,
  todayWon: 0,
  level: 1,
  followersCount: 0,
  followingCount: 0,
  receivedGifts: {},
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shakil_following_ids');
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // fallback
    }
    return new Set<string>();
  });

  // Sync profile to localStorage for persistence across reloads & offline
  useEffect(() => {
    try {
      localStorage.setItem('shakil_voice_user', JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('shakil_following_ids', JSON.stringify(Array.from(followingSet)));
    } catch {}
  }, [followingSet]);

  // Dispose listeners on account changes; never carry a previous account's wallet.
  useEffect(() => {
    let generation = 0;
    let stopProfile = () => {};
    let stopFollows = () => {};
    const stopAuth = onIdTokenChanged(auth, async user => {
      const token = ++generation;
      stopProfile(); stopFollows();
      setCurrentUser(user); setIsAdmin(false); setFollowingSet(new Set());
      setProfile({ ...INITIAL_PROFILE, uid: user?.uid || INITIAL_PROFILE.uid });
      if (!user) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const result = await user.getIdTokenResult();
        if (token !== generation) return;
        setIsAdmin(result.claims.admin === true);
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (token !== generation) return;
        if (!snap.exists()) await setDoc(userRef, {
          ...INITIAL_PROFILE, uid: user.uid, displayName: user.displayName || 'Player',
          avatarUrl: user.photoURL || '😎', coins: 0, createdAt: new Date().toISOString()
        });
        if (token !== generation) return;
        stopProfile = onSnapshot(userRef, d => {
          if (d.exists() && token === generation) setProfile({ ...INITIAL_PROFILE, ...d.data(), todayWon: d.data().winDay === new Date().toISOString().slice(0,10) ? d.data().todayWon || 0 : 0, uid: user.uid } as UserProfile);
        });
        stopFollows = onSnapshot(query(collection(db, 'follows'), where('followerId', '==', user.uid)), snap => {
          if (token === generation) setFollowingSet(new Set(snap.docs.map(d => d.data().followingId)));
        });
      } catch (err) { console.error('Account sync failed', err); }
      finally { if (token === generation) setIsLoading(false); }
    });
    return () => { generation++; stopAuth(); stopProfile(); stopFollows(); };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      // In case popups are blocked or dev frame restricts, inform user
      alert('গুগল লগইন উইন্ডো খোলা যায়নি বা বাতিল করা হয়েছে। আপনি ডেমো অ্যাকাউন্টে সবকিছু খেলতে ও ব্যবহার করতে পারবেন!');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const updateUserProfile = async (displayName: string, avatarUrl: string, bio?: string) => {
    const updated = {
      ...profile,
      displayName: displayName.trim() || profile.displayName,
      avatarUrl: avatarUrl || profile.avatarUrl,
      bio: bio !== undefined ? bio : profile.bio,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
          bio: updated.bio,
          updatedAt: updated.updatedAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  // Legacy React game widgets cannot credit the verified wallet.
  const adjustCoins = async (_amount: number, _wonAmount = 0) => {
    throw new Error('ওয়ালেট পরিবর্তনের জন্য সার্ভার যাচাই প্রয়োজন।');
  };
  const addDemoCoins = (_amount = 1000000) => {
    alert('ডেমো গেমের কয়েন ও যাচাইকৃত ওয়ালেট আলাদা।');
  };
  const sendGift = async (targetUid: string, gift: GiftItem, roomId?: string): Promise<boolean> => {
    if (!currentUser) { alert('গিফট পাঠাতে লগইন করুন।'); return false; }
    try {
      await callServer('sendGift', { targetUid, giftId: gift.id, roomId: roomId || null, requestId: crypto.randomUUID() });
      return true;
    } catch { alert('গিফট পাঠানো যায়নি। ব্যালেন্স ও সার্ভার সংযোগ চেক করুন।'); return false; }
  };

  const toggleFollow = async (targetUid: string): Promise<boolean> => {
    if(!currentUser || targetUid === currentUser.uid) return false;
    const isCurrentlyFollowing = followingSet.has(targetUid);
    const ref = doc(db, 'follows', `${currentUser.uid}_${targetUid}`);
    try {
      if(isCurrentlyFollowing) await deleteDoc(ref);
      else await setDoc(ref,{followerId:currentUser.uid,followingId:targetUid,createdAt:new Date().toISOString()});
      return !isCurrentlyFollowing;
    } catch { alert('ফলো পরিবর্তন সংরক্ষণ হয়নি।'); return isCurrentlyFollowing; }
  };

  const saveGameRound = async (
    round: Omit<GameRoundRecord, 'id' | 'createdAt' | 'userId' | 'userName' | 'userAvatar'>
  ) => {
    const roundId = 'rnd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const record: GameRoundRecord = {
      ...round,
      id: roundId,
      userId: profile.uid,
      userName: profile.displayName,
      userAvatar: profile.avatarUrl,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    try {
      const key = `hist_${round.gameType}`;
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.unshift(record);
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
    } catch {}

    // Save to Firestore for public history & leaderboard
    if (currentUser) {
      try {
        await setDoc(doc(db, 'gameRounds', roundId), record);
        // Also update leaderboard ranking
        const rankId = `${round.gameType}_${currentUser.uid}`;
        await setDoc(doc(db, 'gameRankings', rankId), {
          id: rankId,
          userId: profile.uid,
          userName: profile.displayName,
          userAvatar: profile.avatarUrl,
          gameType: round.gameType,
          todayWon: profile.todayWon + (round.winAmount > 0 ? round.winAmount : 0),
          bestWin: round.winAmount,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn('Game round save to Firestore:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        profile,
        isLoggedInWithGoogle: !!currentUser,
        isLoading,
        followingSet,
        loginWithGoogle,
        logout,
        updateUserProfile,
        adjustCoins,
        sendGift,
        toggleFollow,
        saveGameRound,
        addDemoCoins,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export { DEFAULT_AVATARS };
