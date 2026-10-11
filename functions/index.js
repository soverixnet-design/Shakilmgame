import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
initializeApp();
const databaseId = defineString("FIRESTORE_DATABASE_ID", {
  default: "ai-studio-voxplaysocialhub-25b972ec-15e3-44fc-aa16-09158b2d9f15",
});
const db = () => getFirestore(databaseId.value());
const uidOf = (r) => {
  if (!r.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return r.auth.uid;
};
const admin = (r) => {
  const uid = uidOf(r);
  if (r.auth.token.superAdmin !== true)
    throw new HttpsError("permission-denied", "Admin required");
  return uid;
};
const id = (value) => {
  if (typeof value !== "string" || !value.match(/^[a-zA-Z0-9_-]{1,128}$/))
    throw new HttpsError("invalid-argument", "Invalid ID");
  return value;
};
const integer = (n) => {
  if (!Number.isSafeInteger(n) || n <= 0 || n > 1000000000)
    throw new HttpsError("invalid-argument", "Invalid amount");
  return n;
};
export const creditCoins = onCall(async (r) => {
  const actor = admin(r),
    target = id(r.data.targetUid),
    amount = integer(r.data.amount),
    requestId = id(r.data.requestId);
  return db().runTransaction(async (tx) => {
    const ref = db().doc(`transactions/${actor}_${requestId}`),
      user = db().doc(`users/${target}`);
    const [old, u] = await Promise.all([tx.get(ref), tx.get(user)]);
    if (old.exists) return { ok: true };
    if (!u.exists) throw new HttpsError("not-found", "User not found");
    tx.update(user, { coins: FieldValue.increment(amount) });
    tx.create(ref, {
      type: "admin_credit",
      actor,
      target,
      participants: [actor, target],
      amount,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
});
export const claimDaily = onCall(async (r) => {
  const uid = uidOf(r),
    day = new Date().toISOString().slice(0, 10);
  return db().runTransaction(async (tx) => {
    const ref = db().doc(`dailyClaims/${uid}_${day}`),
      user = db().doc(`users/${uid}`);
    const [old, u] = await Promise.all([tx.get(ref), tx.get(user)]);
    if (old.exists)
      throw new HttpsError("already-exists", "Already claimed today (UTC)");
    if (!u.exists) throw new HttpsError("not-found", "User not found");
    tx.update(user, { coins: FieldValue.increment(100) });
    tx.create(db().doc(`transactions/daily_${uid}_${day}`), {
      type: "daily_reward",
      actor: uid,
      participants: [uid],
      amount: 100,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(ref, { uid, day, createdAt: FieldValue.serverTimestamp() });
    return { ok: true };
  });
});
export const playRound = onCall(async (r) => {
  const uid = uidOf(r),
    requestId = id(r.data.requestId),
    game = r.data.game;
  const { settle } = await import("./game-logic.js");
  return db().runTransaction(async (tx) => {
    const receipt = db().doc(`gameRounds/${uid}_${requestId}`),
      user = db().doc(`users/${uid}`),
      poolRef = db().doc("gameState/jackpot");
    const [old, u, pool] = await Promise.all([
      tx.get(receipt),
      tx.get(user),
      tx.get(poolRef),
    ]);
    if (old.exists) return old.data().settlement;
    if (!u.exists) throw new HttpsError("not-found", "Profile missing");
    let result;
    try {
      result = settle(game, r.data.bets, pool.data()?.amount ?? 21817399);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid game or bet");
    }
    const data = u.data(),
      balance = data.coins || 0;
    if (balance < result.cost)
      throw new HttpsError("failed-precondition", "Insufficient balance");
    const day = new Date().toISOString().slice(0, 10),
      todayWon = (data.winDay === day ? data.todayWon || 0 : 0) + result.win;
    const settlement = {
      ...result,
      balance: balance - result.cost + result.win,
    };
    tx.update(user, {
      coins: settlement.balance,
      todayWon,
      winDay: day,
      totalWon: (data.totalWon || 0) + result.win,
    });
    if (game === "jackpot_fruit") tx.set(poolRef, { amount: result.pool });
    tx.create(db().doc(`transactions/game_${uid}_${requestId}`), {
      type: "game_round",
      actor: uid,
      participants: [uid],
      amount: result.win - result.cost,
      game,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(receipt, {
      userId: uid,
      gameType: game,
      betAmount: result.cost,
      winAmount: result.win,
      result: result.results.join(","),
      createdAt: new Date().toISOString(),
      settlement,
    });
    tx.set(db().doc(`gameRankings/${uid}`), {
      userId: uid,
      userName: data.displayName || "Player",
      userAvatar: data.avatarUrl || "",
      todayWon,
      day,
    });
    return settlement;
  });
});

// Optional TURN REST credentials. Configure TURN_URL and TURN_SHARED_SECRET
// in the backend environment only; never bundle shared secrets in VITE_* variables.
export const getVoiceConfig = onCall(async (r) => {
  const uid = uidOf(r);
  const url = process.env.TURN_URL,
    secret = process.env.TURN_SHARED_SECRET;
  if (!url || !secret) return { iceServers: [] };
  const { createHmac } = await import("node:crypto");
  const username = `${Math.floor(Date.now() / 1000) + 3600}:${uid}`;
  return {
    iceServers: [
      {
        urls: url,
        username,
        credential: createHmac("sha1", secret)
          .update(username)
          .digest("base64"),
      },
    ],
  };
});

export {
  bootstrapUser,
  updateProfile,
  resolveUser,
  setReseller,
  transferCoins,
  purchaseItem,
  sendCatalogGift,
  createRoom,
  joinRoom,
  leaveRoom,
  requestSeat,
  manageRoom,
  leaveSeat,
} from "./social.js";
export { requestRecharge, reviewRecharge } from "./social.js";
export {refreshRoom} from './social.js';
