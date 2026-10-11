import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const catalog = JSON.parse(
  readFileSync(new URL("./catalog.json", import.meta.url)),
);
const databaseId = defineString("FIRESTORE_DATABASE_ID", {
  default: "ai-studio-voxplaysocialhub-25b972ec-15e3-44fc-aa16-09158b2d9f15",
});
const db = () => getFirestore(databaseId.value());
const fail = (code, message) => {
  throw new HttpsError(code, message);
};
const uid = (r) => r.auth?.uid || fail("unauthenticated", "লগইন করুন");
const owner = (r) => {
  const u = uid(r);
  if (r.auth.token.superAdmin !== true)
    fail("permission-denied", "শুধু মালিকের অনুমতি আছে");
  return u;
};
const str = (v, n = 80) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n
    ? v.trim()
    : fail("invalid-argument", "সঠিক তথ্য দিন");
const id = (v) =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(v)
    ? v
    : fail("invalid-argument", "সঠিক ID দিন");
const positive = (v) =>
  Number.isSafeInteger(v) && v > 0 && v <= 1e9
    ? v
    : fail("invalid-argument", "সঠিক কয়েন সংখ্যা দিন");
const stamp = () => FieldValue.serverTimestamp();
const image = (v) =>
  typeof v === "string" &&
  v.length <= 180000 &&
  (/^(https:\/\/[^\s"<>]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/.test(
    v,
  ) ||
    v === "")
    ? v
    : fail("invalid-argument", "ছবিটি সঠিক নয়");
const userRef = (u) => db().doc(`users/${u}`);
const memberRef = (r, u) => db().doc(`rooms/${r}/members/${u}`);
const owned = (p, kind, k) =>
  (k === 0 && kind === "frame") ||
  (kind === "theme" && k < 6) ||
  (p.items || []).includes(`${kind}_${k}`);
export const bootstrapUser = onCall(async (r) => {
  const u = uid(r),
    authUser = await getAuth().getUser(u),
    code = "SM" + randomBytes(6).toString("hex").toUpperCase();
  return db().runTransaction(async (tx) => {
    const ref = userRef(u),
      p = await tx.get(ref);
    if (p.data()?.inviteCode) return p.data();
    let inviter = null;
    if (
      typeof r.data?.ref === "string" &&
      /^SM[A-F0-9]{12}$/.test(r.data.ref)
    ) {
      const q = await tx.get(db().doc(`inviteCodes/${r.data.ref}`));
      if (q.exists && q.data().uid !== u) inviter = q.data().uid;
    }
    const profile = {
      uid: u,
      displayName: authUser.displayName || "নতুন বন্ধু",
      avatarUrl: authUser.photoURL || "",
      bio: "",
      coins: 0,
      items: [],
      frame: 0,
      entry: -1,
      svip: 0,
      createdAt: stamp(),
      ...p.data(),
      inviteCode: code,
      publicId: code.slice(2),
      inviter,
      role: p.data()?.role || "user",
    };
    tx.set(ref, profile);
    tx.create(db().doc(`inviteCodes/${code}`), { uid: u });
    if (inviter)
      tx.set(
        userRef(inviter),
        { inviteCount: FieldValue.increment(1) },
        { merge: true },
      );
    return { ok: true };
  });
});
export const updateProfile = onCall(async (r) => {
  const u = uid(r),
    data = {
      displayName: str(r.data.displayName),
      bio: typeof r.data.bio === "string" ? r.data.bio.slice(0, 300) : "",
      avatarUrl: image(r.data.avatarUrl || ""),
    };
  await userRef(u).update(data);
  return { ok: true };
});
export const resolveUser = onCall(async (r) => {
  uid(r);
  const key = id(r.data.key);
  let ref = userRef(key),
    p = await ref.get();
  if (!p.exists) {
    const code = key.startsWith("SM") ? key : "SM" + key;
    const mapping = await db().doc(`inviteCodes/${code}`).get();
    if (mapping.exists) {
      ref = userRef(mapping.data().uid);
      p = await ref.get();
    }
  }
  if (!p.exists) fail("not-found", "ইউজার পাওয়া যায়নি");
  const d = p.data();
  return {
    uid: ref.id,
    displayName: d.displayName,
    publicId: d.publicId,
    avatarUrl: d.avatarUrl,
  };
});
export const setReseller = onCall(async (r) => {
  const actor = owner(r),
    target = id(r.data.targetUid);
  if (target === actor)
    fail("invalid-argument", "নিজের ভূমিকা পরিবর্তন করা যাবে না");
  const p = await userRef(target).get();
  if (!p.exists) fail("not-found", "ইউজার নেই");
  const user = await getAuth().getUser(target);
  if (user.customClaims?.superAdmin)
    fail("permission-denied", "মালিকের ভূমিকা পরিবর্তন করা যাবে না");
  // Transactions authorize against this server-owned role, so revocation is immediate.
  await db().runTransaction(async (tx) => {
    await tx.get(userRef(target));
    tx.update(userRef(target), {
      role: r.data.enabled === true ? "reseller" : "user",
    });
    tx.create(db().collection("adminAudit").doc(), {
      actor,
      target,
      type: "reseller",
      enabled: r.data.enabled === true,
      createdAt: stamp(),
    });
  });
  return { ok: true };
});
export const transferCoins = onCall(async (r) => {
  const actor = uid(r),
    target = id(r.data.targetUid),
    amount = positive(r.data.amount),
    key = id(r.data.requestId);
  if (actor === target) fail("invalid-argument", "নিজেকে পাঠানো যাবে না");
  return db().runTransaction(async (tx) => {
    const receipt = db().doc(`transactions/${actor}_${key}`),
      [old, a, b] = await Promise.all([
        tx.get(receipt),
        tx.get(userRef(actor)),
        tx.get(userRef(target)),
      ]);
    if (old.exists) return { ok: true };
    if (a.data()?.role !== "reseller")
      fail("permission-denied", "রিসেলার অনুমতি নেই");
    if (!b.exists) fail("not-found", "ইউজার নেই");
    if ((a.data().coins || 0) < amount)
      fail("failed-precondition", "কয়েন যথেষ্ট নয়");
    tx.update(userRef(actor), { coins: FieldValue.increment(-amount) });
    tx.update(userRef(target), { coins: FieldValue.increment(amount) });
    tx.create(receipt, {
      type: "reseller_transfer",
      actor,
      target,
      participants: [actor, target],
      amount,
      createdAt: stamp(),
    });
    return { ok: true };
  });
});
export const purchaseItem = onCall(async (r) => {
  const u = uid(r),
    kind = r.data.kind,
    k = r.data.index,
    lists = {
      frame: catalog.FRM,
      entry: catalog.ENT,
      theme: catalog.THM,
      svip: catalog.SV,
    };
  if (!Object.hasOwn(lists, kind) || !Number.isInteger(k) || !lists[kind][k])
    fail("invalid-argument", "আইটেম নেই");
  const item = lists[kind][k],
    price = kind === "entry" || kind === "theme" ? item[2] : item[1],
    key = `${kind}_${k}`;
  return db().runTransaction(async (tx) => {
    const ref = userRef(u),
      p = await tx.get(ref);
    if (!p.exists) fail("not-found", "প্রোফাইল নেই");
    const d = p.data(),
      has = owned(d, kind, k);
    if (price < 0 && !has) fail("permission-denied", "বিশেষ আইটেম");
    if (!has && (d.coins || 0) < price)
      fail("failed-precondition", "কয়েন যথেষ্ট নয়");
    const patch = { items: FieldValue.arrayUnion(key) };
    if (!has) patch.coins = FieldValue.increment(-price);
    if (kind === "frame" || kind === "entry") patch[kind] = k;
    if (kind === "svip") patch.svip = Math.max(d.svip || 0, k + 1);
    tx.update(ref, patch);
    if (!has)
      tx.create(db().collection("transactions").doc(), {
        type: "purchase",
        actor: u,
        participants: [u],
        item: key,
        amount: price,
        createdAt: stamp(),
      });
    return { ok: true };
  });
});
export const sendCatalogGift = onCall(async (r) => {
  const u = uid(r),
    target = id(r.data.targetUid),
    rid = id(r.data.roomId),
    key = id(r.data.requestId),
    gift = Object.values(catalog.GFT).flat()[r.data.index],
    quantity = positive(r.data.quantity || 1);
  if (!gift || quantity > 99 || target === u)
    fail("invalid-argument", "গিফট বা প্রাপক সঠিক নয়");
  const amount = gift[2] * quantity;
  return db().runTransaction(async (tx) => {
    const receipt = db().doc(`transactions/${u}_${key}`),
      [old, a, b, m, n] = await Promise.all([
        tx.get(receipt),
        tx.get(userRef(u)),
        tx.get(userRef(target)),
        tx.get(memberRef(rid, u)),
        tx.get(memberRef(rid, target)),
      ]);
    if (old.exists) return { ok: true };
    if (!m.data()?.active || m.data()?.banned || !n.data()?.active)
      fail("permission-denied", "রুমের সদস্য হতে হবে");
    if (!a.exists || !b.exists || (a.data().coins || 0) < amount)
      fail("failed-precondition", "কয়েন যথেষ্ট নয়");
    tx.update(userRef(u), {
      coins: FieldValue.increment(-amount),
      spent: FieldValue.increment(amount),
    });
    tx.update(userRef(target), {
      coins: FieldValue.increment(Math.floor(amount * 0.7)),
      received: FieldValue.increment(amount),
    });
    tx.update(db().doc(`rooms/${rid}`), {
      giftTotal: FieldValue.increment(amount),
    });
    tx.create(db().collection(`rooms/${rid}/messages`).doc(), {
      userId: u,
      name: a.data().displayName,
      type: "gift",
      text: `${gift[0]} ${gift[1]} ×${quantity} → ${b.data().displayName}`,
      createdAt: stamp(),
    });
    tx.create(receipt, {
      type: "gift",
      actor: u,
      target,
      participants: [u, target],
      amount,
      createdAt: stamp(),
    });
    return { ok: true };
  });
});
export const createRoom = onCall(async (r) => {
  const u = uid(r),
    title = str(r.data.title),
    room = db().doc(`rooms/${u}`);
  return db().runTransaction(async (tx) => {
    const [existing, p] = await Promise.all([tx.get(room), tx.get(userRef(u))]);
    if (!p.exists) fail("not-found", "প্রোফাইল নেই");
    if (existing.exists) return { roomId: room.id };
    tx.create(room, {
      title,
      hostId: u,
      schemaVersion: 2,
      isPrivate: false,
      category: "চ্যাট",
      announcement: "স্বাগতম! সিটে উঠতে অনুরোধ করুন।",
      coverImage: "",
      theme: 0,
      seatCount: 12,
      lockedSeats: [],
      seats: { 1: u },
      giftTotal: 0,
      createdAt: stamp(),
    });
    tx.set(memberRef(room.id, u), {
      uid: u,
      name: p.data().displayName,
      avatarUrl: p.data().avatarUrl || "",
        frame:p.data().frame||0,
        svip:p.data().svip||0,
        joinedAt:stamp(),
      active: true,
      canSpeak: true,
      muted: false,
      seat: 1,
      role: "host",
      banned: false,
    });
    return { roomId: room.id };
  });
});
export const joinRoom = onCall(async (r) => {
  const u = uid(r),
    rid = id(r.data.roomId);
  return db().runTransaction(async (tx) => {
    const [room, p, m] = await Promise.all([
      tx.get(db().doc(`rooms/${rid}`)),
      tx.get(userRef(u)),
      tx.get(memberRef(rid, u)),
    ]);
    if (!room.exists || !p.exists) fail("not-found", "রুম বা প্রোফাইল নেই");
    if (m.data()?.banned)
      fail("permission-denied", "এই রুমে প্রবেশের অনুমতি নেই");
    const legacy = room.data().schemaVersion !== 2;
    if (legacy)
      tx.update(room.ref, {
        schemaVersion: 2,
        seats: {},
        lockedSeats: [],
        seatCount: 12,
        theme: 0,
        category: "চ্যাট",
        announcement: room.data().topic || "স্বাগতম!",
        coverImage: "",
        giftTotal: 0,
      });
    const isHost = room.data().hostId === u;
    tx.set(
      memberRef(rid, u),
      {
        uid: u,
        name: p.data().displayName,
        avatarUrl: p.data().avatarUrl || "",
        frame:p.data().frame||0,
        svip:p.data().svip||0,
        joinedAt:stamp(),
        active: true,
        canSpeak: isHost || (!legacy && m.data()?.canSpeak === true),
        muted: m.data()?.muted === true,
        seat: legacy ? 0 : m.data()?.seat || 0,
        role: isHost ? "host" : m.data()?.role || "listener",
        banned: false,
      },
      { merge: true },
    );
    return { ok: true };
  });
});
export const leaveRoom = onCall(async (r) => {
  const u = uid(r),
    rid = id(r.data.roomId);
  await db().runTransaction(async (tx) => {
    const rr = db().doc(`rooms/${rid}`),
      [room, m] = await Promise.all([tx.get(rr), tx.get(memberRef(rid, u))]);
    if (!m.exists) return;
    const seats = { ...room.data()?.seats };
    for (const k in seats) if (seats[k] === u) delete seats[k];
    if (room.exists) tx.update(rr, { seats });
    tx.update(memberRef(rid, u), { active: false, canSpeak: false, seat: 0 });
    tx.delete(db().doc(`rooms/${rid}/requests/${u}`));
  });
  return { ok: true };
});
export const requestSeat = onCall(async (r) => {
  const u = uid(r),
    rid = id(r.data.roomId),
    seat = r.data.seat;
  await db().runTransaction(async (tx) => {
    const [room, m] = await Promise.all([
      tx.get(db().doc(`rooms/${rid}`)),
      tx.get(memberRef(rid, u)),
    ]);
    const d = room.data();
    if (!d) fail("not-found", "রুম নেই");
    if (!m.data()?.active || m.data()?.banned)
      fail("permission-denied", "রুমে প্রবেশ করুন");
    if (
      !Number.isInteger(seat) ||
      seat < 1 ||
      seat > d.seatCount ||
      d.lockedSeats.includes(seat) ||
      d.seats[seat]
    )
      fail("failed-precondition", "সিটটি খালি নেই");
    if (d.hostId === u) {
      const seats = { ...d.seats };
      for (const k in seats) if (seats[k] === u) delete seats[k];
      seats[seat] = u;
      tx.update(db().doc(`rooms/${rid}`), { seats });
      tx.update(memberRef(rid, u), { seat, canSpeak: true, muted: false });
    } else
      tx.set(db().doc(`rooms/${rid}/requests/${u}`), {
        uid: u,
        name: m.data().name,
        seat,
        status: "pending",
        createdAt: stamp(),
      });
  });
  return { ok: true };
});
export const manageRoom = onCall(async (r) => {
  const actor = uid(r),
    rid = id(r.data.roomId),
    action = r.data.action,
    target = r.data.targetUid ? id(r.data.targetUid) : actor;
  return db().runTransaction(async (tx) => {
    const rr = db().doc(`rooms/${rid}`),
      [room, a, t, request, profile] = await Promise.all([
        tx.get(rr),
        tx.get(memberRef(rid, actor)),
        tx.get(memberRef(rid, target)),
        tx.get(db().doc(`rooms/${rid}/requests/${target}`)),
        tx.get(userRef(actor)),
      ]);
    const d = room.data();
    if (!d) fail("not-found", "রুম নেই");
    const host = d.hostId === actor,
      moderator = host || a.data()?.role === "moderator";
    if (!moderator || !a.data()?.active || a.data()?.banned)
      fail("permission-denied", "রুম পরিচালনার অনুমতি নেই");
    if (action === "metadata") {
      if (!host) fail("permission-denied", "শুধু হোস্ট");
      const theme = Number(r.data.theme);
      if (
        !Number.isInteger(theme) ||
        !catalog.THM[theme] ||
        !owned(profile.data(), "theme", theme)
      )
        fail("permission-denied", "থিমটি কেনা নেই");
      tx.update(rr, {
        title: str(r.data.title),
        announcement: str(r.data.announcement, 300),
        coverImage: image(r.data.coverImage || ""),
        theme,
        category: ["চ্যাট", "গেম", "পার্টি"].includes(r.data.category)
          ? r.data.category
          : "চ্যাট",
      });
      return { ok: true };
    }
    if (action === "lock") {
      if (
        !Number.isInteger(r.data.seat) ||
        r.data.seat < 1 ||
        r.data.seat > d.seatCount ||
        d.seats[r.data.seat]
      )
        fail("invalid-argument", "খালি সিট বেছে নিন");
      tx.update(rr, {
        lockedSeats: r.data.locked
          ? FieldValue.arrayUnion(r.data.seat)
          : FieldValue.arrayRemove(r.data.seat),
      });
      return { ok: true };
    }
    if (!t.exists) fail("not-found", "সদস্য নেই");
    if (target === d.hostId || (!host && t.data().role === "moderator"))
      fail("permission-denied", "এই সদস্যকে পরিবর্তন করা যাবে না");
    if (action === "approve") {
      const req = request.data();
      if (
        !req ||
        req.status !== "pending" ||
        !t.data().active ||
        t.data().banned ||
        d.seats[req.seat] ||
        d.lockedSeats.includes(req.seat)
      )
        fail("failed-precondition", "অনুরোধ বা সিট আর উপলব্ধ নেই");
      const seats = { ...d.seats };
      for (const k in seats) if (seats[k] === target) delete seats[k];
      seats[req.seat] = target;
      tx.update(rr, { seats });
      tx.update(memberRef(rid, target), {
        seat: req.seat,
        canSpeak: true,
        muted: false,
      });
      tx.delete(request.ref);
    } else if (action === "reject") tx.delete(request.ref);
    else if (action === "mute")
      tx.update(memberRef(rid, target), { muted: r.data.muted === true });
    else if (action === "moderator") {
      if (!host) fail("permission-denied", "শুধু হোস্ট");
      tx.update(memberRef(rid, target), {
        role: r.data.enabled ? "moderator" : "listener",
      });
    } else if (["remove", "kick", "unban"].includes(action)) {
      const seats = { ...d.seats };
      for (const k in seats) if (seats[k] === target) delete seats[k];
      tx.update(rr, { seats });
      tx.update(memberRef(rid, target), {
        seat: 0,
        canSpeak: false,
        muted: true,
        ...(action === "kick"
          ? { active: false, banned: true }
          : action === "unban"
            ? { banned: false }
            : {}),
      });
      tx.delete(request.ref);
    } else fail("invalid-argument", "সঠিক কাজ বেছে নিন");
    return { ok: true };
  });
});
export const leaveSeat = onCall(async (r) => {
  const u = uid(r),
    rid = id(r.data.roomId);
  await db().runTransaction(async (tx) => {
    const rr = db().doc(`rooms/${rid}`),
      [room, m] = await Promise.all([tx.get(rr), tx.get(memberRef(rid, u))]);
    if (!m.exists || !room.exists) return;
    const seats = { ...room.data().seats };
    for (const k in seats) if (seats[k] === u) delete seats[k];
    tx.update(rr, { seats });
    tx.update(memberRef(rid, u), { seat: 0, canSpeak: false });
  });
  return { ok: true };
});
export const requestRecharge = onCall(async (r) => {
  const u = uid(r),
    amount = positive(r.data.amount),
    reference = str(r.data.reference, 160),
    key = id(r.data.requestId);
  const ref = db().doc(`recharges/${u}_${key}`);
  await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, {
      uid: u,
      amount,
      reference,
      status: "pending",
      createdAt: stamp(),
    });
  });
  return { ok: true };
});
export const reviewRecharge = onCall(async (r) => {
  const actor = owner(r),
    key = id(r.data.id);
  return db().runTransaction(async (tx) => {
    const ref = db().doc(`recharges/${key}`),
      q = await tx.get(ref);
    if (!q.exists) fail("not-found", "অনুরোধ নেই");
    const d = q.data();
    if (d.status !== "pending") return { ok: true };
    const p = await tx.get(userRef(d.uid));
    if (!p.exists) fail("not-found", "ইউজার নেই");
    const inviter = p.data().inviter;
    const inv = inviter ? await tx.get(userRef(inviter)) : null;
    if (r.data.approved === true) {
      tx.update(userRef(d.uid), { coins: FieldValue.increment(d.amount) });
      const reward = Math.floor(d.amount * 0.05);
      if (inv?.exists && reward)
        tx.update(userRef(inviter), {
          coins: FieldValue.increment(reward),
          inviteEarned: FieldValue.increment(reward),
        });
      tx.create(db().doc(`transactions/recharge_${key}`), {
        type: "verified_recharge",
        actor,
        target: d.uid,
        participants: [actor, d.uid, ...(inv?.exists ? [inviter] : [])],
        amount: d.amount,
        referralReward: inv?.exists ? reward : 0,
        createdAt: stamp(),
      });
    }
    tx.update(ref, {
      status: r.data.approved ? "approved" : "rejected",
      actor,
      reviewedAt: stamp(),
    });
    return { ok: true };
  });
});
// Any active member can ask the server to release expired seats. Client clocks
// cannot evict users: timestamps and the grace period are checked here.
export const refreshRoom = onCall(async r => {
 const actor=uid(r),rid=id(r.data.roomId);
 return db().runTransaction(async tx=>{
  const roomRef=db().doc(`rooms/${rid}`),[room,me]=await Promise.all([tx.get(roomRef),tx.get(memberRef(rid,actor))]);
  if(!room.exists||!me.data()?.active||me.data()?.banned)fail('permission-denied','রুমে প্রবেশ করুন');
  const seats={...room.data().seats},occupants=[...new Set(Object.values(seats))].filter(u=>u!==actor);
  const records=await Promise.all(occupants.map(async u=>({u,p:await tx.get(db().doc(`rooms/${rid}/presence/${u}`)),m:await tx.get(memberRef(rid,u))})));
  let changed=false;
  for(const {u,p,m} of records){const last=p.data()?.updatedAt?.toMillis?.()||m.data()?.joinedAt?.toMillis?.()||0;if(Date.now()-last<150000)continue;changed=true;for(const k in seats)if(seats[k]===u)delete seats[k];if(m.exists)tx.update(memberRef(rid,u),{active:false,canSpeak:false,seat:0});tx.delete(db().doc(`rooms/${rid}/requests/${u}`));}
  if(changed)tx.update(roomRef,{seats});return {ok:true};
 });
});
