import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const catalog = JSON.parse(readFileSync("functions/catalog.json", "utf8"));
function harness(seed = {}) {
  const data = new Map(Object.entries(structuredClone(seed)));
  let seq = 0;
  const copy = (x) => (x === undefined ? undefined : structuredClone(x));
  const ref = (path) => ({
    path,
    id: path.split("/").at(-1),
    get: async () => snap(path),
    update: async (patch) => apply(path, patch),
    set: async (patch) => apply(path, patch),
  });
  const snap = (path) => ({
    exists: data.has(path),
    id: path.split("/").at(-1),
    ref: ref(path),
    data: () => copy(data.get(path)),
  });
  function apply(path, patch) {
    const out = { ...(data.get(path) || {}) };
    for (const [k, v] of Object.entries(patch))
      out[k] =
        v?.op === "inc"
          ? (out[k] || 0) + v.value
          : v?.op === "union"
            ? [...new Set([...(out[k] || []), ...v.value])]
            : v?.op === "remove"
              ? (out[k] || []).filter((x) => !v.value.includes(x))
              : copy(v);
    data.set(path, out);
  }
  const db = {
    doc: ref,
    collection: (path) => ({
      doc: () => ref(path + "/auto" + ++seq),
      add: async (patch) => apply(path + "/auto" + ++seq, patch),
    }),
    runTransaction: async (fn) => {
      const changes = [];
      let wrote = false;
      const tx = {
        get: async (r) => {
          assert.equal(wrote, false, "all reads must precede writes");
          return snap(r.path);
        },
        set: (r, d) => {
          wrote = true;
          changes.push(() => apply(r.path, d));
        },
        create: (r, d) => {
          wrote = true;
          changes.push(() => {
            assert.ok(!data.has(r.path));
            apply(r.path, d);
          });
        },
        update: (r, d) => {
          wrote = true;
          changes.push(() => {
            assert.ok(data.has(r.path));
            apply(r.path, d);
          });
        },
        delete: (r) => {
          wrote = true;
          changes.push(() => data.delete(r.path));
        },
      };
      const result = await fn(tx);
      for (const change of changes) change();
      return result;
    },
  };
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const context = vm.createContext({
    initializeApp: () => {},
    getFirestore: () => db,
    getAuth: () => ({
      getUser: async (u) => ({
        displayName: u,
        photoURL: "",
        customClaims: {},
      }),
    }),
    onCall: (f) => f,
    HttpsError,
    defineString: () => ({ value: () => "(default)" }),
    FieldValue: {
      serverTimestamp: () => 0,
      increment: (value) => ({ op: "inc", value }),
      arrayUnion: (...value) => ({ op: "union", value }),
      arrayRemove: (...value) => ({ op: "remove", value }),
    },
    randomBytes,
    catalog,
    URL,
    Date,
    console,
  });
  let source = readFileSync("functions/social.js", "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace(/^const catalog\s*=\s*JSON.parse\([\s\S]*?\n\);\n/m, "")
    .replace(/export const (\w+)\s*=/g, "globalThis.$1=");
  new vm.Script(source).runInContext(context);
  const moneySource = readFileSync("functions/index.js", "utf8")
    .split("export const playRound")[0]
    .replace(/^import .*;\n/gm, "")
    .replace(/export const (\w+)\s*=/g, "globalThis.$1=");
  new vm.Script("{\n" + moneySource + "\n}").runInContext(context);
  return {
    data,
    call: (name, actor, payload = {}, token = {}) =>
      context[name]({
        auth: actor ? { uid: actor, token } : null,
        data: payload,
      }),
  };
}
const users = {
  "users/host": { displayName: "Host", coins: 1000, items: [] },
  "users/seller": { displayName: "Seller", coins: 500, role: "reseller" },
  "users/user": { displayName: "User", coins: 100 },
  "users/inviter": { coins: 0 },
};
const room = {
  "rooms/r": {
    schemaVersion: 2,
    hostId: "host",
    isPrivate: false,
    seatCount: 12,
    seats: { 1: "host" },
    lockedSeats: [],
  },
  "rooms/r/members/host": {
    role: "host",
    active: true,
    canSpeak: true,
    muted: false,
    seat: 1,
  },
  "rooms/r/members/user": {
    role: "listener",
    active: true,
    canSpeak: false,
    muted: false,
    seat: 0,
  },
  "rooms/r/members/seller": {
    role: "moderator",
    active: true,
    canSpeak: false,
  },
};
test("anonymous users cannot reach wallet or room handlers", async () => {
  const h = harness(users);
  for (const name of [
    "bootstrapUser",
    "transferCoins",
    "purchaseItem",
    "createRoom",
    "requestSeat",
    "manageRoom",
    "requestRecharge",
    "reviewRecharge",
  ])
    await assert.rejects(h.call(name, null), { code: "unauthenticated" });
});
test("resellers transfer existing funds exactly once; overdraw commits nothing", async () => {
  const h = harness(users),
    p = { targetUid: "user", amount: 300, requestId: "transfer1" };
  await h.call("transferCoins", "seller", p);
  await h.call("transferCoins", "seller", p);
  assert.equal(h.data.get("users/seller").coins, 200);
  assert.equal(h.data.get("users/user").coins, 400);
  await assert.rejects(
    h.call("transferCoins", "seller", {
      ...p,
      amount: 201,
      requestId: "transfer2",
    }),
  );
  assert.equal(h.data.get("users/seller").coins, 200);
});
test("normal users and revoked resellers cannot transfer or grant roles", async () => {
  const h = harness(users);
  await assert.rejects(
    h.call("transferCoins", "user", {
      targetUid: "seller",
      amount: 1,
      requestId: "t",
    }),
    { code: "permission-denied" },
  );
  await assert.rejects(
    h.call("setReseller", "seller", { targetUid: "user", enabled: true }),
    { code: "permission-denied" },
  );
  h.data.get("users/seller").role = "user";
  await assert.rejects(
    h.call("transferCoins", "seller", {
      targetUid: "user",
      amount: 1,
      requestId: "t",
    }),
    { code: "permission-denied" },
  );
});
test("recharge approval requires owner and mints referral only once", async () => {
  const h = harness({
    ...users,
    "users/user": { coins: 100, inviter: "inviter" },
  });
  await h.call("requestRecharge", "user", {
    amount: 1000,
    reference: "verified offline payment",
    requestId: "r1",
  });
  assert.equal(h.data.get("users/user").coins, 100);
  await assert.rejects(
    h.call("reviewRecharge", "seller", { id: "user_r1", approved: true }),
    { code: "permission-denied" },
  );
  await h.call(
    "reviewRecharge",
    "host",
    { id: "user_r1", approved: true },
    { superAdmin: true },
  );
  await h.call(
    "reviewRecharge",
    "host",
    { id: "user_r1", approved: true },
    { superAdmin: true },
  );
  assert.equal(h.data.get("users/user").coins, 1100);
  assert.equal(h.data.get("users/inviter").coins, 50);
});
test("declined recharge cannot later be approved or rewarded", async () => {
  const h = harness(users);
  await h.call("requestRecharge", "user", {
    amount: 100,
    reference: "bad reference",
    requestId: "r2",
  });
  await h.call(
    "reviewRecharge",
    "host",
    { id: "user_r2", approved: false },
    { superAdmin: true },
  );
  await h.call(
    "reviewRecharge",
    "host",
    { id: "user_r2", approved: true },
    { superAdmin: true },
  );
  assert.equal(h.data.get("users/user").coins, 100);
});
test("seat request does not grant speaking; host approval does", async () => {
  const h = harness({ ...users, ...room });
  await h.call("requestSeat", "user", { roomId: "r", seat: 2 });
  assert.equal(h.data.get("rooms/r/members/user").canSpeak, false);
  await assert.rejects(
    h.call("manageRoom", "user", {
      roomId: "r",
      action: "approve",
      targetUid: "user",
    }),
    { code: "permission-denied" },
  );
  await h.call("manageRoom", "host", {
    roomId: "r",
    action: "approve",
    targetUid: "user",
  });
  assert.equal(h.data.get("rooms/r/members/user").canSpeak, true);
  assert.equal(h.data.get("rooms/r").seats[2], "user");
});
test("locked seats reject requests and stale approvals", async () => {
  const h = harness({ ...users, ...room });
  await h.call("requestSeat", "user", { roomId: "r", seat: 2 });
  await h.call("manageRoom", "host", {
    roomId: "r",
    action: "lock",
    seat: 2,
    locked: true,
  });
  await assert.rejects(
    h.call("manageRoom", "host", {
      roomId: "r",
      action: "approve",
      targetUid: "user",
    }),
  );
  await assert.rejects(h.call("requestSeat", "user", { roomId: "r", seat: 2 }));
  assert.equal(h.data.get("rooms/r/members/user").canSpeak, false);
});
test("kick removes seat and prevents rejoin; moderators cannot change host", async () => {
  const h = harness({ ...users, ...room });
  await h.call("requestSeat", "user", { roomId: "r", seat: 2 });
  await h.call("manageRoom", "host", {
    roomId: "r",
    action: "approve",
    targetUid: "user",
  });
  await h.call("manageRoom", "host", {
    roomId: "r",
    action: "kick",
    targetUid: "user",
  });
  assert.equal(h.data.get("rooms/r").seats[2], undefined);
  assert.equal(h.data.get("rooms/r/members/user").canSpeak, false);
  await assert.rejects(h.call("joinRoom", "user", { roomId: "r" }), {
    code: "permission-denied",
  });
  await assert.rejects(
    h.call("manageRoom", "seller", {
      roomId: "r",
      action: "mute",
      targetUid: "host",
      muted: true,
    }),
    { code: "permission-denied" },
  );
});
test("only room host edits cover, title and owned theme", async () => {
  const h = harness({ ...users, ...room }),
    p = {
      roomId: "r",
      action: "metadata",
      title: "New",
      announcement: "Hello",
      coverImage: "",
      theme: 0,
    };
  await assert.rejects(h.call("manageRoom", "seller", p), {
    code: "permission-denied",
  });
  await assert.rejects(h.call("manageRoom", "host", { ...p, theme: 9 }), {
    code: "permission-denied",
  });
  await h.call("manageRoom", "host", p);
  assert.equal(h.data.get("rooms/r").title, "New");
});
test("catalog prices are server controlled and ownership prevents double charge", async () => {
  const index = catalog.FRM.findIndex((x) => x[1] > 0);
  const price = catalog.FRM[index][1];
  const h = harness({
    ...users,
    "users/user": { coins: price * 2, items: [] },
  });
  await h.call("purchaseItem", "user", { kind: "frame", index, price: 0 });
  await h.call("purchaseItem", "user", { kind: "frame", index, price: 0 });
  assert.equal(h.data.get("users/user").coins, price);
  assert.equal(h.data.get("users/user").frame, index);
  await assert.rejects(
    h.call("purchaseItem", "user", { kind: "__proto__", index: 0 }),
  );
});
test("gift debits, recipient credit and room total are atomic and idempotent", async () => {
  const h = harness({ ...users, ...room }),
    p = {
      roomId: "r",
      targetUid: "user",
      index: 1,
      quantity: 10,
      requestId: "gift1",
    };
  await h.call("sendCatalogGift", "host", p);
  await h.call("sendCatalogGift", "host", p);
  assert.equal(h.data.get("users/host").coins, 950);
  assert.equal(h.data.get("users/user").coins, 135);
  assert.equal(h.data.get("rooms/r").giftTotal, 50);
});
test("leaving a seat immediately revokes speaking while keeping membership", async () => {
  const h = harness({ ...users, ...room });
  await h.call("leaveSeat", "host", { roomId: "r" });
  assert.equal(h.data.get("rooms/r/members/host").canSpeak, false);
  assert.equal(h.data.get("rooms/r/members/host").active, true);
  assert.equal(h.data.get("rooms/r").seats[1], undefined);
});

test("owner-only credits cannot be invoked with an old admin claim", async()=>{
 const h=harness(users),p={targetUid:'user',amount:1000,requestId:'credit1'};
 await assert.rejects(h.call('creditCoins','seller',p,{admin:true}),{code:'permission-denied'});
 await h.call('creditCoins','host',p,{superAdmin:true});
 await h.call('creditCoins','host',p,{superAdmin:true});
 assert.equal(h.data.get('users/user').coins,1100);
});
test("daily check-in can credit only once per UTC day",async()=>{
 const h=harness(users);await h.call('claimDaily','user');
 await assert.rejects(h.call('claimDaily','user'),{code:'already-exists'});
 assert.equal(h.data.get('users/user').coins,200);
});
test("new profiles ignore client balance and role inputs",async()=>{
 const h=harness();await h.call('bootstrapUser','new',{coins:1000000,role:'reseller'});
 assert.equal(h.data.get('users/new').coins,0);assert.equal(h.data.get('users/new').role,'user');
});
