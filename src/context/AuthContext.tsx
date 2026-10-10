import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, GiftItem, GameRoundRecord } from '../types';

interface AuthContextType {
  currentUser: User | null;
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
  coins: 1000000, // 10 Lakh starting demo coins as in the templates
  totalWon: 0,
  todayWon: 0,
  level: 12,
  followersCount: 24,
  followingCount: 15,
  receivedGifts: { g1: 15, g2: 8, g5: 3, g8: 1 },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('shakil_voice_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PROFILE;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shakil_following_ids');
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // fallback
    }
    return new Set(['user_nusrat', 'user_shakil_pro', 'user_riya']);
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Load or create Firestore user profile
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(prev => ({
              ...prev,
              ...data,
              uid: user.uid,
              displayName: data.displayName || user.displayName || prev.displayName,
              avatarUrl: data.avatarUrl || user.photoURL || prev.avatarUrl,
            }));
          } else {
            // Create initial user in Firestore
            const newProf: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || profile.displayName || 'User_' + user.uid.substring(0, 5),
              avatarUrl: user.photoURL || profile.avatarUrl || '😎',
              bio: profile.bio || 'Voice & Gaming Lover',
              coins: Math.max(profile.coins, 1000000),
              totalWon: profile.totalWon || 0,
              todayWon: profile.todayWon || 0,
              level: 1,
              followersCount: 0,
              followingCount: 0,
              receivedGifts: profile.receivedGifts || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProf);
            setProfile(newProf);
          }

          // Setup real-time listener for this user
          const unsubDoc = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(p => ({ ...p, ...(docSnap.data() as UserProfile) }));
            }
          }, (err) => {
            console.warn('User sync onSnapshot:', err);
          });

          setIsLoading(false);
          return () => unsubDoc();
        } catch (err) {
          console.error('Error fetching Firestore user profile:', err);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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

  // Adjust coins (works for both bet spend, game win, gift send, and topup)
  const adjustCoins = async (amount: number, wonAmount: number = 0) => {
    setProfile(prev => {
      const nextCoins = Math.max(0, prev.coins + amount);
      const nextTodayWon = wonAmount > 0 ? prev.todayWon + wonAmount : prev.todayWon;
      const nextTotalWon = wonAmount > 0 ? prev.totalWon + wonAmount : prev.totalWon;
      const nextLevel = Math.max(prev.level, Math.floor(nextTotalWon / 500000) + 1);

      const newP: UserProfile = {
        ...prev,
        coins: nextCoins,
        todayWon: nextTodayWon,
        totalWon: nextTotalWon,
        level: nextLevel,
        updatedAt: new Date().toISOString(),
      };

      if (currentUser) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          coins: nextCoins,
          todayWon: nextTodayWon,
          totalWon: nextTotalWon,
          level: nextLevel,
          updatedAt: newP.updatedAt,
        }).catch(err => {
          console.warn('Syncing coins to Firestore:', err);
        });
      }

      return newP;
    });
  };

  const addDemoCoins = (amount: number = 1000000) => {
    adjustCoins(amount, 0);
  };

  const sendGift = async (targetUid: string, gift: GiftItem, roomId?: string): Promise<boolean> => {
    if (profile.coins < gift.price) {
      return false;
    }

    // Deduct coins from sender
    await adjustCoins(-gift.price);

    // Save to local cache for instant UI reflection
    try {
      const cacheKey = `received_gifts_${targetUid}`;
      const saved = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      saved[gift.id] = (saved[gift.id] || 0) + 1;
      localStorage.setItem(cacheKey, JSON.stringify(saved));
      window.dispatchEvent(new CustomEvent('gift_received', { detail: { targetUid, gift } }));
    } catch {}

    // Update target user's received gifts in Firestore
    if (targetUid && targetUid !== profile.uid) {
      try {
        const targetRef = doc(db, 'users', targetUid);
        await setDoc(
          targetRef,
          {
            receivedGifts: {
              [gift.id]: increment(1),
            },
            coins: increment(Math.floor(gift.price * 0.7)), // 70% direct value to recipient's profile!
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore gift sync notice:', err);
      }
    } else if (targetUid === profile.uid) {
      // Self gift test
      setProfile((prev) => ({
        ...prev,
        receivedGifts: {
          ...prev.receivedGifts,
          [gift.id]: ((prev.receivedGifts && prev.receivedGifts[gift.id]) || 0) + 1,
        },
      }));
    }

    return true;
  };

  const toggleFollow = async (targetUid: string): Promise<boolean> => {
    const isCurrentlyFollowing = followingSet.has(targetUid);
    const nextSet = new Set(followingSet);

    if (isCurrentlyFollowing) {
      nextSet.delete(targetUid);
      setFollowingSet(nextSet);
      setProfile(prev => ({ ...prev, followingCount: Math.max(0, prev.followingCount - 1) }));
    } else {
      nextSet.add(targetUid);
      setFollowingSet(nextSet);
      setProfile(prev => ({ ...prev, followingCount: prev.followingCount + 1 }));
    }

    if (currentUser) {
      const followDocId = `${currentUser.uid}_${targetUid}`;
      try {
        if (!isCurrentlyFollowing) {
          await setDoc(doc(db, 'follows', followDocId), {
            followerId: currentUser.uid,
            followingId: targetUid,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Firestore follow record error:', err);
      }
    }

    return !isCurrentlyFollowing;
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
