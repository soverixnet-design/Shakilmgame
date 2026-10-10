import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { GiftItem } from '../types';

export interface GameConfigItem {
  id: 'night_food' | 'lion_food' | 'slots' | 'jackpot_fruit';
  path: string;
  title: string;
  titleEn: string;
  icon: string;
  badge: string;
  payoutDesc: string;
  enabled: boolean;
}

export interface AppBrandingConfig {
  name: string;
  tagline: string;
  logo: string;
  announcement: string;
}

export interface VoiceRoomSettingsConfig {
  defaultSeatCount: number;
  categories: string[];
  welcomeMessage: string;
}

export interface CoinPackageConfig {
  coins: number;
  price: string;
  bonus: string;
  popular: boolean;
}

export interface AppSettingsState {
  branding: AppBrandingConfig;
  games: GameConfigItem[];
  roomSettings: VoiceRoomSettingsConfig;
  gifts: GiftItem[];
  packages: CoinPackageConfig[];
}

const DEFAULT_SETTINGS: AppSettingsState = {
  branding: {
    name: 'Shakil Voice Room',
    tagline: 'VOICE & GAMES HUB',
    logo: 'S',
    announcement: 'ভয়েস রুম ও ডেমো গেমসে স্বাগতম!',
  },
  games: [
    {
      id: 'night_food',
      path: '/games/night_food.html',
      title: 'নাইট ফুড হুইল',
      titleEn: 'Night Food Wheel',
      icon: '🌙',
      badge: 'জনপ্রিয় 🔥',
      payoutDesc: 'x45 পর্যন্ত গুণক • 🥗 সালাদ x1.2 ও 🍕 পিজা x4 বেট',
      enabled: true,
    },
    {
      id: 'lion_food',
      path: '/games/lion_food.html',
      title: 'সিংহ ফুড হুইল',
      titleEn: 'Lion Food Wheel',
      icon: '🦁',
      badge: 'মেগা উইন 🦁',
      payoutDesc: 'x45 চিকেন • 🐙 অক্টোপাস x25 • ২০ সেকেন্ড রাউন্ড',
      enabled: true,
    },
    {
      id: 'slots',
      path: '/games/slots.html',
      title: 'স্লটস (Bonus Pile Up!)',
      titleEn: 'Classic 3-Reel Slots',
      icon: '🎰',
      badge: 'জ্যাকপট x70',
      payoutDesc: '777 এ x70 গুণ • বামদিক থেকে মিললেই জয়',
      enabled: true,
    },
    {
      id: 'jackpot_fruit',
      path: '/games/jackpot_fruit.html',
      title: 'জ্যাকপট ফ্রুট',
      titleEn: 'Jackpot Fruit Multiplier',
      icon: '🍓',
      badge: 'পুল ২১M+',
      payoutDesc: '🍒 চেরি x40 • মিনি স্লটে x2, x3 ও JACKPOT বোনাস',
      enabled: true,
    },
  ],
  roomSettings: {
    defaultSeatCount: 8,
    categories: ['Adda', 'Gaming', 'Love', 'Music', 'Fun', 'Chill'],
    welcomeMessage: 'রুমে স্বাগতম! গান, গল্প ও গেমসের আসরে যোগ দিন 🌸',
  },
  gifts: [
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
  ],
  packages: [
    { coins: 2500000, price: '৫০ টাকা', bonus: '২.৫ মিলিয়ন', popular: false },
    { coins: 5000000, price: '১০০ টাকা', bonus: '🔥 সেরা অফার (৫ মিলিয়ন কয়েন)', popular: true },
    { coins: 10000000, price: '২০০ টাকা', bonus: '+১M বোনাস (১১ মিলিয়ন)', popular: false },
    { coins: 25000000, price: '৫০০ টাকা', bonus: '+৫M বোনাস (৩০ মিলিয়ন)', popular: false },
    { coins: 60000000, price: '১,০০০ টাকা', bonus: '👑 মেগা ভিআইপি (৭০ মিলিয়ন)', popular: false },
  ],
};

interface SettingsContextType {
  settings: AppSettingsState;
  updateBranding: (branding: Partial<AppBrandingConfig>) => Promise<void>;
  updateGame: (gameId: string, partial: Partial<GameConfigItem>) => Promise<void>;
  updateRoomSettings: (roomSettings: Partial<VoiceRoomSettingsConfig>) => Promise<void>;
  updateGift: (giftId: string, partial: Partial<GiftItem>) => Promise<void>;
  addCustomGift: (newGift: GiftItem) => Promise<void>;
  removeGift: (giftId: string) => Promise<void>;
  updatePackages: (packages: CoinPackageConfig[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettingsState>(() => {
    try {
      const saved = localStorage.getItem('shakil_app_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Listen to Firestore settings/appConfig
  useEffect(() => {
    try {
      const configRef = doc(db, 'settings', 'appConfig');
      const unsub = onSnapshot(configRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppSettingsState;
          setSettings((prev) => ({
            ...prev,
            ...data,
            branding: { ...prev.branding, ...(data.branding || {}) },
            games: data.games || prev.games,
            roomSettings: { ...prev.roomSettings, ...(data.roomSettings || {}) },
            gifts: data.gifts || prev.gifts,
            packages: data.packages || prev.packages,
          }));
        }
      }, (err) => {
        console.warn('Settings onSnapshot:', err);
      });

      return () => unsub();
    } catch {}
  }, []);

  const saveSettings = async (next: AppSettingsState) => {
    setSettings(next);
    try {
      localStorage.setItem('shakil_app_settings', JSON.stringify(next));
      await setDoc(doc(db, 'settings', 'appConfig'), next, { merge: true });
    } catch (err) {
      console.warn('Saving settings to Firestore:', err);
      throw err;
    }
  };

  const updateBranding = async (partial: Partial<AppBrandingConfig>) => {
    const next: AppSettingsState = {
      ...settings,
      branding: { ...settings.branding, ...partial },
    };
    await saveSettings(next);
  };

  const updateGame = async (gameId: string, partial: Partial<GameConfigItem>) => {
    const nextGames = settings.games.map((g) => (g.id === gameId ? { ...g, ...partial } : g));
    const next: AppSettingsState = {
      ...settings,
      games: nextGames,
    };
    await saveSettings(next);
  };

  const updateRoomSettings = async (partial: Partial<VoiceRoomSettingsConfig>) => {
    const next: AppSettingsState = {
      ...settings,
      roomSettings: { ...settings.roomSettings, ...partial },
    };
    await saveSettings(next);
  };

  const updateGift = async (giftId: string, partial: Partial<GiftItem>) => {
    const nextGifts = settings.gifts.map((g) => (g.id === giftId ? { ...g, ...partial } : g));
    const next: AppSettingsState = {
      ...settings,
      gifts: nextGifts,
    };
    await saveSettings(next);
  };

  const addCustomGift = async (newGift: GiftItem) => {
    const next: AppSettingsState = {
      ...settings,
      gifts: [...settings.gifts, newGift],
    };
    await saveSettings(next);
  };

  const removeGift = async (giftId: string) => {
    const next: AppSettingsState = {
      ...settings,
      gifts: settings.gifts.filter((g) => g.id !== giftId),
    };
    await saveSettings(next);
  };

  const updatePackages = async (packages: CoinPackageConfig[]) => {
    const next: AppSettingsState = {
      ...settings,
      packages,
    };
    await saveSettings(next);
  };

  const resetToDefaults = async () => {
    await saveSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateBranding,
        updateGame,
        updateRoomSettings,
        updateGift,
        addCustomGift,
        removeGift,
        updatePackages,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within a SettingsProvider');
  }
  return context;
};
