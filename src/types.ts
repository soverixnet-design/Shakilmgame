export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  coins: number;
  totalWon: number;
  todayWon: number;
  level: number;
  followersCount: number;
  followingCount: number;
  receivedGifts: Record<string, number>; // giftId -> count
  createdAt?: string;
  updatedAt?: string;
}

export interface GiftItem {
  id: string;
  name: string;
  nameBn: string;
  emoji: string;
  price: number;
  color: string;
}

export interface VoiceRoomSeat {
  seatIndex: number;
  user: {
    uid: string;
    displayName: string;
    avatarUrl: string;
    level: number;
  } | null;
  isMuted: boolean;
  isSpeaking: boolean;
  isHost?: boolean;
}

export interface VoiceRoom {
  id: string;
  title: string;
  topic: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  participantsCount: number;
  isPrivate: boolean;
  seats: VoiceRoomSeat[];
  bgGradient?: string;
  createdAt?: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  type: 'chat' | 'gift' | 'system';
  giftEmoji?: string;
  giftCount?: number;
  giftName?: string;
  createdAt: string;
}

export interface GameRoundRecord {
  id: string;
  gameType: 'night_food' | 'lion_food' | 'slots' | 'jackpot_fruit';
  userId: string;
  userName: string;
  userAvatar: string;
  roundNumber: number;
  result: string;
  betAmount: number;
  winAmount: number;
  createdAt: string;
}

export interface LeaderboardUser {
  userId: string;
  userName: string;
  userAvatar: string;
  todayWon: number;
  bestWin?: number;
  level?: number;
  gameType?: string;
}
