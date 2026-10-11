import "./design.css";
import { auth, db, googleProvider } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { callServer } from "./serverApi";
import { VoiceChatEngine } from "./utils/voiceChatEngine";
import C from "../functions/catalog.json";
type Row = Record<string, any>;
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const esc = (v: any) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const fmt = (v: any) => Number(v || 0).toLocaleString("en-US");
const val = (s: string) => ($(s) as HTMLInputElement)?.value || "";
const requestId = () => crypto.randomUUID();
const GR = [
  "linear-gradient(135deg,#ff5c9d,#8a5cff)",
  "linear-gradient(135deg,#19e6c1,#3a7cff)",
  "linear-gradient(135deg,#ffc94d,#ff5c5c)",
  "linear-gradient(135deg,#8a5cff,#19e6c1)",
];
const games = [
  ["🦁", "সিংহ ফুড হুইল", "lion_food"],
  ["🌙", "নাইট ফুড হুইল", "night_food"],
  ["🍒", "জ্যাকপট ফ্রুট", "jackpot_fruit"],
  ["🎰", "স্লটস", "slots"],
];
let category = "সব";
let profile: Row | null = null,
  owner = false,
  tab = "home",
  rooms: Row[] = [],
  posts: Row[] = [],
  dm: Row[] = [],
  error = "",
  authReady = false,
  guest = false;
let globalStops: (() => void)[] = [],
  pageStops: (() => void)[] = [],
  roomStops: (() => void)[] = [];
let activeRoom: Row | null = null,
  members: Row[] = [],
  seatRequests: Row[] = [],
  voice: VoiceChatEngine | null = null,
  mic = false,
  roomSession = 0;
let gameKey = "",
  frame: HTMLIFrameElement | null = null,
  gameBusy = false;
const rounds = new Map<string, Promise<any>>();
let referral =
  new URL(location.href).searchParams.get("ref") ||
  sessionStorage.getItem("referral") ||
  "";
if (referral) sessionStorage.setItem("referral", referral);
function toast(s: string) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  clearTimeout((toast as any).timer);
  (toast as any).timer = setTimeout(
    () => ($("#toast").style.display = "none"),
    4500,
  );
}
function report(e: any) {
  const message = String(e?.message || e);
  toast(message);
  const el = $("#form-error");
  if (el) {
    el.hidden = false;
    el.textContent = message;
  }
}
async function api(name: string, data: Row = {}) {
  if (!auth.currentUser) throw Error("আগে লগইন করুন");
  return (await callServer(name, data)) as any;
}
function need() {
  if (!auth.currentUser) {
    guest = false;
    login();
    return false;
  }
  if (!profile) {
    toast("প্রোফাইল প্রস্তুত হয়নি। সার্ভার সংযোগের পর আবার চেষ্টা করুন।");
    return false;
  }
  return true;
}
function bind(sel: string, fn: (el: HTMLElement) => any) {
  document.querySelectorAll<HTMLElement>(sel).forEach(
    (el) =>
      (el.onclick = async (e) => {
        e.preventDefault();
        if ((el as HTMLButtonElement).disabled) return;
        (el as HTMLButtonElement).disabled = true;
        try {
          await fn(el);
        } catch (e) {
          report(e);
        } finally {
          (el as HTMLButtonElement).disabled = false;
        }
      }),
  );
}
function avatar(p: Row | null, size = 40) {
  const f = C.FRM[p?.frame || 0] || C.FRM[0];
  return `<div class="av ${f[4] ? "fa" : ""}" data-d="${esc(f[3])}" style="width:${size}px;height:${size}px;background:${f[2]}"><div>${p?.avatarUrl ? `<img class="avatar" src="${esc(p.avatarUrl)}" alt="">` : "😎"}</div></div>`;
}
function empty(icon: string, text: string) {
  return `<div class="empty"><b>${icon}</b>${esc(text)}</div>`;
}
function top(title: string) {
  return `<div class="topbar"><h1>${title}</h1><button class="ib" data-action="create" aria-label="রুম তৈরি">＋</button><button class="ib" data-action="profile" aria-label="প্রোফাইল">${avatar(profile, 38)}</button></div>`;
}
function closePage() {
  pageStops.splice(0).forEach((f) => f());
  $("#pg").classList.remove("on");
  $("#pg").innerHTML = "";
}
function page(title: string, body: string) {
  closePage();
  $("#pg").classList.add("on");
  $("#pg").innerHTML =
    `<div class="row" style="padding:12px 14px"><button class="ib" id="back" aria-label="ফিরুন">‹</button><b>${esc(title)}</b></div><div class="pagebody">${body}<div id="form-error" class="error" hidden></div></div>`;
  bind("#back", closePage);
}
function sheet(title: string, body: string) {
  $("#sh").classList.add("on");
  $("#shb").innerHTML =
    `<div class="row"><h3 class="sp">${esc(title)}</h3><button class="ib" id="sheet-close">×</button></div>${body}`;
  bind("#sheet-close", () => $("#sh").classList.remove("on"));
}
$("#sh").onclick = (e) => {
  if (e.target === $("#sh")) $("#sh").classList.remove("on");
};
function nav() {
  const items = [
    ["home", "🏠", "রুম"],
    ["explore", "🧭", "এক্সপ্লোর"],
    ["wallet", "👛", "ওয়ালেট"],
    ["moments", "📸", "মোমেন্টস"],
    ["msg", "✉️", "মেসেজ"],
  ];
  $("#nav").innerHTML = items
    .map(
      ([k, e, t]) =>
        `<button data-tab="${k}" class="${tab === k ? "on" : ""}"><b>${e}</b>${t}</button>`,
    )
    .join("");
  bind("[data-tab]", (el) => {
    closePage();
    tab = el.dataset.tab!;
    render();
    $("#main").scrollTop = 0;
  });
}
function render() {
  if (!authReady) return;
  if (!auth.currentUser && !guest) {
    if($("#login-form"))return;
    login();
    return;
  }
  nav();
  (
    ({ home, explore, wallet, moments: momentPage, msg: messages })[tab] || home
  )();
  bind('[data-action="profile"]', profilePage);
  bind('[data-action="create"]', createRoom);
  bind("[data-game]", (el) => openGame(el.dataset.game!));
  bind("[data-room]", (el) => enterRoom(el.dataset.room!));
}
function status() {
  return error
    ? `<div class="error">${esc(error)} <button class="b mini" id="retry">আবার চেষ্টা</button></div>`
    : guest
      ? '<div class="status">ডিজাইন প্রিভিউ • কয়েন ও ভয়েসের জন্য লগইন করুন</div>'
      : "";
}
function home() {
  $("#main").innerHTML =
    top('Recommend <span class="tg">Hot</span>') +
    status() +
    `<div class="bnr"><button class="bn" id="banner-wallet" style="background:${GR[0]}">💰 আপনার কয়েন ওয়ালেট</button><button class="bn" data-game="lion_food" style="background:${GR[2]}">🎡 Happy Food Wheel</button><button class="bn" id="banner-invite" style="background:${GR[1]}">🎁 Invite & Earn 5%</button></div><div class="sm" style="margin:8px 0 14px">📢 বন্ধুদের সঙ্গে আড্ডা, গিফট এবং আপনার প্রিয় গেমস</div><div class="tiles">${[games[1], games[3], games[0]].map((g, i) => `<button class="tl" data-game="${g[2]}" style="background:${GR[i]}"><b>${g[0]}</b>${g[1]}</button>`).join("")}</div><div class="cc" style="margin-top:20px">${["সব", "চ্যাট", "গেম", "পার্টি"].map((c) => `<button class="chip ${category === c ? "on" : ""}" data-category="${c}">${c}</button>`).join("")}</div><div class="tp">🎙️ Voice Rooms <span class="sp"></span><button class="b mini" data-action="create">＋ তৈরি করুন</button></div><div class="rg">${
      rooms
        .filter((r) => category === "সব" || r.category === category)
        .map(
          (r, i) =>
            `<button class="rc" data-room="${r.id}" style="background:${GR[i % 4]}">${r.coverImage ? `<img class="roomcover" src="${esc(r.coverImage)}" alt="">` : '<div class="cvv">🎤</div>'}<span class="fl">🇧🇩</span><span class="ls">${Object.keys(r.seats || {}).length} সিট</span><span class="tg2">${esc(r.category || "চ্যাট")}</span><b>${esc(r.title)}</b><div class="sm2">${esc(r.announcement)}</div></button>`,
        )
        .join("") || empty("🎙️", "এখনো কোনো রুম নেই। প্রথম রুমটি তৈরি করুন।")
    }</div>`;
  bind("#banner-wallet", () => {
    tab = "wallet";
    render();
  });
  bind("#banner-invite", invite);
  bind("#retry", bootstrap);
  bind("[data-category]", (el) => {
    category = el.dataset.category!;
    render();
  });
}
function gameCards() {
  return `<div class="gr gr2" style="margin:16px 0 24px">${games.map((g, i) => `<button class="gx" data-game="${g[2]}" style="--bg:${GR[i]};--sh:#3b1269"><b>${g[0]}</b>${g[1]}<span class="pl">▶ খেলুন</span></button>`).join("")}</div>`;
}
function explore() {
  $("#main").innerHTML =
    top("এক্সপ্লোর") +
    status() +
    gameCards() +
    `<div class="gl card"><h3>🏆 গেম লিডারবোর্ড</h3><div id="leaderboard">লোড হচ্ছে…</div></div><div class="tiles"><button class="tl" id="daily" style="background:${GR[1]}"><b>✅</b>চেক-ইন</button><button class="tl" id="store" style="background:${GR[0]}"><b>🛍️</b>স্টোর</button><button class="tl" id="invite" style="background:${GR[2]}"><b>🎁</b>ইনভাইট</button></div>`;
  bind("#daily", async () => {
    if (!need()) return;
    await api("claimDaily");
    toast("আজকের ১০০ কয়েন যোগ হয়েছে");
  });
  bind("#store", () => store());
  bind("#invite", invite);
  void loadLeaderboard();
}
async function loadLeaderboard() {
  try {
    const snap = await getDocs(
      query(
        collection(db, "gameRankings"),
        where("day","==",new Date().toISOString().slice(0,10)),
        orderBy("todayWon", "desc"),
        limit(10),
      ),
    );
    const el = $("#leaderboard");
    if (el)
      el.innerHTML =
        snap.docs
          .map(
            (d, i) =>
              `<div class="rwx"><b>${i + 1}</b><span class="sp">${esc(d.data().userName)}</span><b>🪙 ${fmt(d.data().todayWon)}</b></div>`,
          )
          .join("") || empty("🏆", "এখনো ফলাফল নেই");
  } catch {
    if ($("#leaderboard"))
      $("#leaderboard").textContent = "লিডারবোর্ড এখন পাওয়া যাচ্ছে না";
  }
}
function wallet() {
  $("#main").innerHTML =
    top("ওয়ালেট") +
    status() +
    `<div class="gl card" style="background:linear-gradient(135deg,#ff5c9d44,#ffc94d22)"><div class="muted">মোট কয়েন</div><div class="balance" data-balance>🪙 ${fmt(profile?.coins)}</div><p class="muted">একই ব্যালান্স • চারটি গেম • গিফট • স্টোর</p></div><div class="stack"><button class="b g" id="recharge">＋ রিচার্জ অনুরোধ</button><button class="b" id="history">লেনদেনের ইতিহাস</button>${owner ? '<button class="b t" id="admin">🛡️ মালিকের অ্যাডমিন প্যানেল</button>' : ""}${profile?.role === "reseller" ? '<button class="b t" id="transfer">🤝 রিসেলার কয়েন ট্রান্সফার</button>' : ""}<button class="b" id="invite">🎁 ইনভাইট ও রিওয়ার্ড</button></div>`;
  bind("#recharge", recharge);
  bind("#history", history);
  bind("#admin", adminPanel);
  bind("#transfer", () => transferPanel(false));
  bind("#invite", invite);
}
function profilePage() {
  if (!need()) return;
  page(
    "আমার প্রোফাইল",
    `<div class="row gl card">${avatar(profile, 80)}<div><h2>${esc(profile!.displayName)}</h2><p class="muted">ID: ${esc(profile!.publicId)}</p><span class="tg">${owner ? "OWNER" : profile!.role === "reseller" ? "RESELLER" : "MEMBER"}</span> ${profile!.svip ? "👑 SVIP " + profile!.svip : ""}</div></div><p class="muted">${esc(profile!.bio)}</p><div class="lv3"><div>🪙 ${fmt(profile!.coins)}<small>ওয়ালেট</small></div><div>🎁 ${fmt(profile!.inviteCount)}<small>ইনভাইট</small></div></div><div class="cir">${[
      ["edit", "✏️", "প্রোফাইল"],
      ["store", "🛍️", "স্টোর"],
      ["myroom", "🎙️", "আমার রুম"],
      ["invite", "🎁", "ইনভাইট"],
    ]
      .map(
        ([id, e, n], i) =>
          `<button style="background:none" id="p-${id}"><i style="background:${GR[i]}">${e}</i>${n}</button>`,
      )
      .join(
        "",
      )}</div><div class="gl card"><div class="stack"><button class="b g" id="p-svip">👑 SVIP ও সাজসজ্জা</button><button class="b" id="p-history">লেনদেন</button>${owner ? '<button class="b t" id="p-admin">অ্যাডমিন প্যানেল</button>' : ""}<button class="b r" id="logout">লগ আউট</button></div></div>`,
  );
  bind("#p-edit", editProfile);
  bind("#p-store", () => store());
  bind("#p-svip", () => store("svip"));
  bind("#p-myroom", createRoom);
  bind("#p-invite", invite);
  bind("#p-history", history);
  bind("#p-admin", adminPanel);
  bind("#logout", async () => {
    await exitRoom();
    await signOut(auth);
  });
}
async function fileImage(file?: File) {
  if (!file) return "";
  if (!file.type.startsWith("image/") || file.size > 10e6)
    throw Error("১০ MB-এর ছোট ছবি দিন");
  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 400 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  const data = canvas.toDataURL("image/jpeg", 0.75);
  if (data.length > 180000) throw Error("ছবিটি আরও ছোট করুন");
  return data;
}
function editProfile() {
  page(
    "প্রোফাইল সম্পাদনা",
    `<form id="profile-form" class="stack"><label>নাম<input class="in" id="name" maxlength="80" required value="${esc(profile!.displayName)}"></label><label>নিজের কথা<textarea class="in" id="bio" maxlength="300">${esc(profile!.bio)}</textarea></label><label>প্রোফাইল ছবি<input type="file" accept="image/*" id="photo" class="in"></label><button class="b t">সংরক্ষণ</button></form>`,
  );
  $("#profile-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const avatarUrl =
        (await fileImage(($("#photo") as HTMLInputElement).files?.[0])) ||
        profile!.avatarUrl;
      await api("updateProfile", {
        displayName: val("#name"),
        bio: val("#bio"),
        avatarUrl,
      });
      toast("প্রোফাইল সংরক্ষিত");
      closePage();
    } catch (e) {
      report(e);
    }
  };
}
function store(kind = "frame") {
  if (!need()) return;
  const lists: Row = { frame: C.FRM, entry: C.ENT, theme: C.THM, svip: C.SV };
  page(
    "স্টোর",
    `<div class="chips">${[
      ["frame", "ফ্রেম"],
      ["entry", "এন্ট্রি"],
      ["theme", "রুম থিম"],
      ["svip", "SVIP"],
    ]
      .map(
        ([k, n]) =>
          `<button class="chip ${k === kind ? "on" : ""}" data-store="${k}">${n}</button>`,
      )
      .join(
        "",
      )}</div><p class="muted">🪙 <span data-balance>${fmt(profile!.coins)}</span> • কেনা আইটেম আবার ব্যবহার করতে কয়েন লাগবে না।</p><div class="st3">${lists[
      kind
    ]
      .map((it: any[], i: number) => {
        const own =
          profile!.items?.includes(`${kind}_${i}`) ||
          (kind === "frame" && i === 0) ||
          (kind === "theme" && i < 6);
        const price = it[kind === "entry" || kind === "theme" ? 2 : 1];
        return `<div class="it">${kind === "frame" ? avatar({ frame: i }, 54) : kind === "theme" ? `<div style="height:80px;border-radius:12px;background:${it[1]}"></div>` : `<b style="font-size:36px">${kind === "svip" ? "👑" : it[0]}</b>`}<p>${esc(it[kind === "entry" ? 1 : 0])}</p><small>${own ? "আপনার" : price < 0 ? "বিশেষ আইটেম" : "🪙 " + fmt(price)}</small><button class="b mini" data-buy="${i}" ${price < 0 && !own ? "disabled" : ""}>${own ? "ব্যবহার" : price < 0 ? "বিশেষ" : "কিনুন"}</button></div>`;
      })
      .join("")}</div>`,
  );
  bind("[data-store]", (el) => store(el.dataset.store));
  bind("[data-buy]", async (el) => {
    await api("purchaseItem", { kind, index: Number(el.dataset.buy) });
    toast(
      kind === "theme" ? "রুম সেটিংস থেকে থিমটি বেছে নিন" : "আইটেম যুক্ত হয়েছে",
    );
  });
}
function invite() {
  if (!need()) return;
  const link = new URL(import.meta.env.BASE_URL, location.origin);
  link.searchParams.set("ref", profile!.inviteCode);
  page(
    "Invite & Earn",
    `<div class="gl card" style="text-align:center"><div style="font-size:64px">🎁</div><h2>বন্ধুদের আমন্ত্রণ জানান</h2><p class="muted">আপনার লিংকে নতুন অ্যাকাউন্ট খুলে মালিক-অনুমোদিত রিচার্জ করলে আপনি ৫% কয়েন পাবেন। ট্রান্সফারে এই বোনাস প্রযোজ্য নয়।</p><div class="lv3"><div>${fmt(profile!.inviteCount)}<small>আমন্ত্রিত বন্ধু</small></div><div>${fmt(profile!.inviteEarned)}<small>অর্জিত কয়েন</small></div></div><input class="in" id="invite-link" readonly value="${esc(link.href)}"><div class="stack"><button class="b t" id="copy">লিংক কপি</button><button class="b" id="share">শেয়ার করুন</button></div></div>`,
  );
  bind("#copy", async () => {
    await navigator.clipboard.writeText(link.href);
    toast("লিংক কপি হয়েছে");
  });
  bind("#share", async () => {
    if (navigator.share)
      await navigator.share({ title: "Shakil M Voice Rooms", url: link.href });
    else {
      await navigator.clipboard.writeText(link.href);
      toast("লিংক কপি হয়েছে");
    }
  });
}
function recharge() {
  if (!need()) return;
  const key = requestId();
  page(
    "রিচার্জ অনুরোধ",
    `<p class="muted">মালিকের সঙ্গে পেমেন্টের ব্যবস্থা করে রেফারেন্স দিন। মালিক যাচাই করে অনুমোদন দিলে কয়েন যোগ হবে। এই ফর্ম নিজে কোনো টাকা কাটে না।</p><div class="stack"><label>কয়েন<input class="in" type="number" id="amount" min="1" max="1000000000"></label><label>পেমেন্ট/যোগাযোগের রেফারেন্স<input class="in" id="reference" maxlength="160"></label><button class="b g" id="send-recharge">অনুরোধ পাঠান</button></div>`,
  );
  bind("#send-recharge", async () => {
    await api("requestRecharge", {
      amount: Number(val("#amount")),
      reference: val("#reference"),
      requestId: key,
    });
    toast("অনুরোধ পাঠানো হয়েছে");
    closePage();
  });
}
function history() {
  if (!need()) return;
  page("লেনদেনের ইতিহাস", '<div id="transactions">লোড হচ্ছে…</div>');
  pageStops.push(
    onSnapshot(
      query(
        collection(db, "transactions"),
        where("participants", "array-contains", auth.currentUser!.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      ),
      (s) => {
        if ($("#transactions"))
          $("#transactions").innerHTML =
            s.docs
              .map((d) => {
                const x = d.data();
                return `<div class="message"><small>${esc(x.type)} • ${x.createdAt?.toDate().toLocaleString() || ""}</small>🪙 ${fmt(x.amount)}${x.target ? `<div class="sm">প্রাপক: ${esc(x.target)}</div>` : ""}</div>`;
              })
              .join("") || empty("📒", "এখনো লেনদেন নেই");
      },
      report,
    ),
  );
}
function transferPanel(isOwner: boolean) {
  if (!need() || (isOwner && !owner)) return;
  let target: Row | null = null,
    key = requestId();
  page(
    isOwner ? "কয়েন দিন / রিসেলার পরিচালনা" : "রিসেলার ট্রান্সফার",
    `<p class="muted">${isOwner ? "মালিকের দেওয়া কয়েন সরাসরি প্রাপকের ওয়ালেটে যোগ হবে।" : "আপনার নিজের ব্যালান্স থেকে কয়েন পাঠানো হবে।"} 🪙 ${fmt(profile!.coins)}</p><div class="stack"><label>প্রাপকের ID বা UID<input class="in" id="target"></label><button class="b" id="find-user">ইউজার খুঁজুন</button><div id="recipient"></div><label>কয়েন<input class="in" type="number" id="amount" min="1" max="1000000000"></label><button class="b g" id="credit">কয়েন পাঠান</button>${isOwner ? '<button class="b t" id="make-reseller">রিসেলার করুন</button><button class="b r" id="remove-reseller">রিসেলার অনুমতি বন্ধ</button>' : ""}</div>`,
  );
  bind("#find-user", async () => {
    target = await api("resolveUser", { key: val("#target").trim() });
    $("#recipient").innerHTML =
      `<div class="gl card">${esc(target!.displayName)}<br>ID: ${esc(target!.publicId)}</div>`;
  });
  bind("#credit", async () => {
    if (!target) throw Error("আগে ইউজার খুঁজে প্রাপক যাচাই করুন");
    await api(isOwner ? "creditCoins" : "transferCoins", {
      targetUid: target.uid,
      amount: Number(val("#amount")),
      requestId: key,
    });
    toast("কয়েন পাঠানো হয়েছে");
    key = requestId();
    ($("#amount") as HTMLInputElement).value = "";
  });
  for (const [sel, enabled] of [
    ["#make-reseller", true],
    ["#remove-reseller", false],
  ] as const)
    bind(sel, async () => {
      if (!target) throw Error("আগে ইউজার খুঁজুন");
      await api("setReseller", { targetUid: target.uid, enabled });
      toast("রিসেলার অনুমতি আপডেট হয়েছে");
    });
}
function adminPanel() {
  if (!owner) return;
  page(
    "🛡️ মালিকের অ্যাডমিন প্যানেল",
    `<div class="status">আপনার যাচাইকৃত মালিক অ্যাকাউন্ট ছাড়া এই কাজগুলো করা যাবে না।</div><button class="b t full" id="grant">ইউজার / রিসেলারকে কয়েন দিন</button><h3>অপেক্ষমাণ রিচার্জ</h3><p class="muted">পেমেন্ট নিজে যাচাই করে অনুমোদন দিন।</p><div id="pending">লোড হচ্ছে…</div>`,
  );
  bind("#grant", () => transferPanel(true));
  pageStops.push(
    onSnapshot(
      query(
        collection(db, "recharges"),
        where("status", "==", "pending"),
        limit(50),
      ),
      (s) => {
        if (!$("#pending")) return;
        $("#pending").innerHTML =
          s.docs
            .map((d) => {
              const x = d.data();
              return `<div class="message"><small>${esc(x.uid)}</small><b>🪙 ${fmt(x.amount)}</b><p>${esc(x.reference)}</p><div class="room-actions"><button class="b t mini" data-review="${d.id}" data-yes="1">যাচাই করেছি — অনুমোদন</button><button class="b r mini" data-review="${d.id}">বাতিল</button></div></div>`;
            })
            .join("") || empty("✅", "কোনো অনুরোধ নেই");
        bind("[data-review]", async (el) => {
          await api("reviewRecharge", {
            id: el.dataset.review,
            approved: el.dataset.yes === "1",
          });
          toast("সিদ্ধান্ত সংরক্ষিত");
        });
      },
      report,
    ),
  );
}
function momentPage() {
  $("#main").innerHTML =
    top("মোমেন্টস") +
    `<button class="b t full" id="new-post">＋ আপনার মুহূর্ত শেয়ার করুন</button><div>${posts.map((p) => `<article class="gl card"><b>${esc(p.name)}</b><p style="margin:12px 0;white-space:pre-wrap">${esc(p.text)}</p>${p.image ? `<img class="postimg" src="${esc(p.image)}" alt="শেয়ার করা ছবি">` : ""}<div class="muted">${p.createdAt?.toDate().toLocaleDateString() || ""}</div>${p.uid === auth.currentUser?.uid || owner ? `<button class="b mini r" data-delete-post="${p.id}">মুছুন</button>` : ""}</article>`).join("") || empty("📸", "বন্ধুদের সঙ্গে প্রথম মুহূর্তটি শেয়ার করুন")}</div>`;
  bind("#new-post", () => {
    if (!need()) return;
    page(
      "নতুন মোমেন্ট",
      `<div class="stack"><textarea id="post-text" class="in msg-input" maxlength="1000" placeholder="কী ভাবছেন?"></textarea><input type="file" accept="image/*" id="post-photo" class="in"><button class="b t" id="publish-post">পোস্ট করুন</button></div>`,
    );
    bind("#publish-post", async () => {
      const text = val("#post-text").trim();
      if (!text) throw Error("কিছু লিখুন");
      const image = await fileImage(
        ($("#post-photo") as HTMLInputElement).files?.[0],
      );
      await addDoc(collection(db, "moments"), {
        uid: auth.currentUser!.uid,
        name: profile!.displayName,
        text,
        image,
        createdAt: serverTimestamp(),
      });
      closePage();
      toast("পোস্ট হয়েছে");
    });
  });
  bind("[data-delete-post]", async (el) => {
    await deleteDoc(doc(db, "moments", el.dataset.deletePost!));
  });
}
function messages() {
  $("#main").innerHTML =
    top("মেসেজ") +
    `<button class="b t full" id="new-message">＋ নতুন মেসেজ</button><div>${dm.map((m) => `<div class="message"><small>${m.from === auth.currentUser?.uid ? "আপনি → " + esc(m.to) : esc(m.from) + " → আপনি"}</small><p>${esc(m.text)}</p><button class="b mini" data-reply="${esc(m.from === auth.currentUser?.uid ? m.to : m.from)}">উত্তর দিন</button></div>`).join("") || empty("✉️", "এখনো কোনো মেসেজ নেই")}</div>`;
  bind("#new-message", () => compose());
  bind("[data-reply]", (el) => compose(el.dataset.reply));
}
function compose(target = "") {
  if (!need()) return;
  page(
    "মেসেজ পাঠান",
    `<div class="stack"><label>প্রাপকের ID বা UID<input class="in" id="to" value="${esc(target)}"></label><textarea class="in msg-input" id="dm-text" maxlength="1000" placeholder="মেসেজ লিখুন"></textarea><button class="b t" id="dm-send">পাঠান</button></div>`,
  );
  bind("#dm-send", async () => {
    const text = val("#dm-text").trim();
    if (!text) throw Error("মেসেজ লিখুন");
    const to = await api("resolveUser", { key: val("#to") });
    await addDoc(collection(db, "directMessages"), {
      from: auth.currentUser!.uid,
      to: to.uid,
      participants: [auth.currentUser!.uid, to.uid],
      text,
      createdAt: serverTimestamp(),
    });
    closePage();
    toast("মেসেজ পাঠানো হয়েছে");
  });
}
function createRoom() {
  if (!need()) return;
  const existing = rooms.find((r) => r.hostId === auth.currentUser!.uid);
  if (existing) {
    void enterRoom(existing.id).catch(report);
    return;
  }
  page(
    "আপনার ভয়েস রুম",
    `<div class="gl card"><div style="font-size:64px;text-align:center">🎙️</div><h3>একসঙ্গে আড্ডা হোক</h3><div class="stack"><label>রুমের নাম<input class="in" id="room-name" maxlength="80" placeholder="বাংলা আড্ডা"></label><button class="b t" id="create-room">রুম তৈরি করুন</button></div></div>`,
  );
  bind("#create-room", async () => {
    const r = await api("createRoom", { title: val("#room-name") });
    await enterRoom(r.roomId);
  });
}
async function enterRoom(id: string) {
  if (!need()) return;
  await exitRoom();
  await api("joinRoom", { roomId: id });
  closePage();
  const session = ++roomSession;
  activeRoom = { id };
  members = [];
  seatRequests = [];
  $("#ov").classList.add("on");
  $("#ov").innerHTML = empty("🎙️", "রুমে যুক্ত হচ্ছে…");
  roomStops.push(
    onSnapshot(
      doc(db, "rooms", id),
      (s) => {
        if (session !== roomSession) return;
        activeRoom = { id, ...s.data() };
        renderRoom();
      },
      report,
    ),
  );
  roomStops.push(
    onSnapshot(
      collection(db, "rooms", id, "members"),
      (s) => {
        if (session !== roomSession) return;
        members = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        const me = members.find((m) => m.id === auth.currentUser?.uid);
        if (me && (!me.active || me.banned)) {
          void exitRoom();
          toast("রুম থেকে বের করা হয়েছে");
          return;
        }
        if (!me?.canSpeak || me?.muted) {
          voice?.setMute(true);
          mic = false;
        }
        renderSeats();
        if($("#mic")){$("#mic").textContent=mic?'🎙️':'🔇';$("#mic").classList.toggle('on',mic);}
      },
      (e) => {
        if (session === roomSession) {
          void exitRoom();
          report(e);
        }
      },
    ),
  );
  voice = new VoiceChatEngine(id, auth.currentUser!.uid, profile!.displayName);
  const cleanupTimer=setInterval(()=>{void api("refreshRoom",{roomId:id}).catch(console.warn)},60000);
  roomStops.push(()=>clearInterval(cleanupTimer));
  voice.setCallbacks(
    (v) => {
      document
        .querySelector(`[data-peer="${auth.currentUser?.uid}"]`)
        ?.classList.toggle("talk", v > 12);
    },
    (peers) => {
      peers.forEach((p, k) =>
        document
          .querySelector(`[data-peer="${k}"]`)
          ?.classList.toggle("talk", p.isSpeaking && !p.isMuted),
      );
    },
  );
  roomStops.push(
    onSnapshot(
      query(
        collection(db, "rooms", id, "messages"),
        orderBy("createdAt", "desc"),
        limit(80),
      ),
      (s) => {
        if (session !== roomSession) return;
        renderChat(s.docs.map((d) => d.data()).reverse());
      },
      report,
    ),
  );
  const entry = C.ENT[profile!.entry];
  if (entry) {
    setTimeout(() => {
      if (session !== roomSession) return;
      const el = document.createElement("div");
      el.className = "entry-banner";
      el.textContent = `${entry[0]} ${profile!.displayName} • ${entry[1]}`;
      $("#ov").append(el);
      setTimeout(() => el.remove(), 4000);
    }, 800);
  }
}
let chat: Row[] = [];
function renderChat(rows = chat) {
  chat = rows;
  if (!$("#ch3")) return;
  $("#ch3").innerHTML = rows
    .map(
      (m) =>
        `<p class="${m.type === "gift" ? "gift" : ""}"><b>${esc(m.name)}</b> ${esc(m.text)}</p>`,
    )
    .join("");
  $("#ch3").scrollTop = $("#ch3").scrollHeight;
}
function renderRoom() {
  if (!activeRoom?.title) return;
  const draft = val("#chat-text");
  const r = activeRoom,
    theme = C.THM[r.theme || 0]?.[1] || C.THM[0][1];
  $("#ov").innerHTML =
    `<div class="rv" style="background:${theme}"><div class="row" style="padding:12px"><button class="hp sp" id="room-info">${r.coverImage ? `<img src="${esc(r.coverImage)}" style="width:38px;height:38px;border-radius:12px;object-fit:cover" alt="">` : "🎙️"}<div><b>${esc(r.title)}</b><small>${esc(r.id.slice(0, 12))}</small></div></button><button class="gi" id="audio-resume" aria-label="অডিও শুনুন">🔊</button><button class="gi" id="room-share" aria-label="শেয়ার">↗</button><button class="gi" id="room-exit" aria-label="রুম ছাড়ুন">×</button></div><div class="row" style="padding:0 14px"><small class="sp">🎁 ${fmt(r.giftTotal)}</small><small id="member-count"></small></div><div class="sg3" id="seats" style="grid-template-columns:repeat(4,1fr)"></div><div class="ct3"><div class="ctb"><span class="on">চ্যাট</span><span>${esc(r.announcement)}</span></div><div id="ch3"></div></div><div class="fb"><button id="room-games" aria-label="গেমস">🎮</button><button id="room-gift" aria-label="গিফট">🎁</button></div><form class="bb" id="chat-form"><button type="button" class="go" id="room-tools" aria-label="রুম পরিচালনা">⚙️</button><input id="chat-text" maxlength="1000" placeholder="কথা লিখুন…" aria-label="চ্যাট"><button class="go" type="submit" aria-label="পাঠান">➤</button><button type="button" class="go ${mic ? "on" : ""}" id="mic" aria-label="মাইক">${mic ? "🎙️" : "🔇"}</button></form></div>`;
  renderSeats();
  renderChat();
  ($("#chat-text") as HTMLInputElement).value = draft;
  bind("#room-exit", exitRoom);
  bind("#room-share", async () => {
    const link = new URL(import.meta.env.BASE_URL, location.origin);
    link.searchParams.set("room", r.id);
    await navigator.clipboard.writeText(link.href);
    toast("রুমের লিংক কপি হয়েছে");
  });
  bind("#audio-resume", () => {
    voice?.resumeAudio();
    toast("অডিও চালু করা হয়েছে");
  });
  bind("#room-info", roomSettings);
  bind("#room-tools", roomTools);
  bind("#room-games", () => {
    sheet("আপনার গেমস", gameCards());
    bind("[data-game]", (el) => {
      $("#sh").classList.remove("on");
      openGame(el.dataset.game!);
    });
  });
  bind("#room-gift", () => gifts());
  bind("#mic", async () => {
    const me = members.find((m) => m.id === auth.currentUser?.uid);
    if (!me?.canSpeak || me.muted) throw Error("সিট ও কথা বলার অনুমতি দরকার");
    if (mic) {
      voice?.setMute(true);
      mic = false;
    } else {
      mic = await voice!.startMicrophone();
      if (!mic)
        throw Error("মাইক্রোফোন চালু হয়নি। ব্রাউজারের অনুমতি পরীক্ষা করুন।");
    }
    $("#mic").textContent = mic ? "🎙️" : "🔇";
    $("#mic").classList.toggle("on", mic);
  });
  $("#chat-form").onsubmit = async (e) => {
    e.preventDefault();
    const text = val("#chat-text").trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "rooms", r.id, "messages"), {
        userId: auth.currentUser!.uid,
        name: profile!.displayName,
        type: "chat",
        text,
        createdAt: serverTimestamp(),
      });
      ($("#chat-text") as HTMLInputElement).value = "";
    } catch (e) {
      report(e);
    }
  };
}
function renderSeats() {
  if (!$("#seats") || !activeRoom) return;
  const r = activeRoom;
  $("#seats").innerHTML = Array.from({ length: r.seatCount || 12 }, (_, i) => {
    const seat = i + 1,
      u = r.seats?.[seat],
      m = members.find((x) => x.id === u),
      locked = r.lockedSeats?.includes(seat);
    return `<div class="s3w"><button class="s3 ${m ? "on" : ""}" data-seat="${seat}" data-peer="${esc(u || "")}" aria-label="সিট ${seat}">${m ? avatar(m, 48) : locked ? "🔒" : seat}</button><div class="nm3">${m ? esc(m.name) : locked ? "লক" : "খালি সিট"}</div><span class="sc3">${m ? (m.muted ? "🔇" : "🎙️") : "＋"}</span></div>`;
  }).join("");
  if ($("#member-count"))
    $("#member-count").textContent =
      `👥 ${members.filter((m) => m.active && !m.banned).length}`;
  bind("[data-seat]", async (el) => {
    const seat = Number(el.dataset.seat),
      u = r.seats?.[seat];
    if (u) {
      sheet(
        "সদস্য",
        `<p class="card">${esc(members.find((m) => m.id === u)?.name || "সদস্য")}</p><button class="b g full" id="gift-person">🎁 গিফট পাঠান</button>`,
      );
      bind("#gift-person", () => gifts(u));
      return;
    }
    if (r.lockedSeats?.includes(seat)) throw Error("সিটটি লক করা");
    await api("requestSeat", { roomId: r.id, seat });
    toast(
      r.hostId === auth.currentUser?.uid
        ? "সিটে উঠেছেন"
        : "হোস্টের কাছে সিটের অনুরোধ পাঠানো হয়েছে",
    );
  });
}
async function exitRoom() {
  const id = activeRoom?.id;
  roomSession++;
  roomStops.splice(0).forEach((f) => f());
  voice?.destroy();
  voice = null;
  mic = false;
  activeRoom = null;
  members = [];
  chat = [];
  $("#ov").classList.remove("on");
  $("#ov").innerHTML = "";
  $("#sh").classList.remove("on");
  if (id && auth.currentUser)
    try {
      await api("leaveRoom", { roomId: id });
    } catch (e) {
      console.warn("Room leave could not be confirmed", e);
    }
}
function roomSettings() {
  const r = activeRoom;
  if (!r) return;
  if (r.hostId !== auth.currentUser?.uid) {
    sheet(r.title, `<p class="card">${esc(r.announcement)}</p>`);
    return;
  }
  page(
    "রুমের ছবি ও সেটিংস",
    `<div class="stack"><label>নাম<input class="in" id="r-title" maxlength="80" value="${esc(r.title)}"></label><label>নোটিশ<textarea class="in" id="r-ann" maxlength="300">${esc(r.announcement)}</textarea></label><label>রুমের প্রোফাইল ছবি<input class="in" type="file" accept="image/*" id="r-photo"></label><label>ক্যাটাগরি<select class="in" id="r-category">${["চ্যাট", "গেম", "পার্টি"].map((c) => `<option ${r.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>থিম<select class="in" id="r-theme">${C.THM.map((t, i) => (i < 6 || profile!.items?.includes("theme_" + i) ? `<option value="${i}" ${r.theme === i ? "selected" : ""}>${esc(t[0])}</option>` : "")).join("")}</select></label><button class="b t" id="r-save">সংরক্ষণ</button></div>`,
  );
  bind("#r-save", async () => {
    const coverImage =
      (await fileImage(($("#r-photo") as HTMLInputElement).files?.[0])) ||
      r.coverImage ||
      "";
    await api("manageRoom", {
      roomId: r.id,
      action: "metadata",
      title: val("#r-title"),
      announcement: val("#r-ann"),
      coverImage,
      category: val("#r-category"),
      theme: Number(val("#r-theme")),
    });
    closePage();
    toast("রুম আপডেট হয়েছে");
  });
}
function roomTools() {
  const r = activeRoom,
    me = members.find((m) => m.id === auth.currentUser?.uid);
  if (!r) return;
  const mod = ["host", "moderator"].includes(me?.role);
  page(
    "সিট ও মাইক নিয়ন্ত্রণ",
    `<button class="b full" id="leave-seat">নিজের সিট ছাড়ুন</button>${mod ? '<h3>সিটের অনুরোধ</h3><div id="requests"></div><h3>সদস্য পরিচালনা</h3><div id="manage-members"></div><h3>খালি সিট লক / আনলক</h3><div id="locks" class="gr"></div>' : '<p class="muted card">খালি সিটে ট্যাপ করে হোস্টের অনুমতি নিন।</p>'}`,
  );
  bind("#leave-seat", async () => {
    await api("leaveSeat", { roomId: r.id });
    voice?.setMute(true);
    mic = false;
    closePage();
  });
  if (!mod) return;
  const draw = () => {
    if (!$("#manage-members")) return;
    $("#manage-members").innerHTML = members
      .filter((m) => m.id !== r.hostId)
      .map(
        (m) =>
          `<div class="message"><b>${esc(m.name)}</b> <small>${m.active ? "অনলাইন" : "বের হয়েছেন"} • ${esc(m.role)}</small><div class="room-actions"><button class="b mini" data-manage="mute" data-target="${m.id}" data-enabled="${m.muted ? "0" : "1"}">${m.muted ? "আনমিউট" : "মিউট"}</button><button class="b mini" data-manage="remove" data-target="${m.id}">সিট থেকে নামান</button><button class="b r mini" data-manage="${m.banned ? "unban" : "kick"}" data-target="${m.id}">${m.banned ? "ব্যান তুলুন" : "ব্যান"}</button>${r.hostId === auth.currentUser?.uid ? `<button class="b t mini" data-manage="moderator" data-target="${m.id}" data-enabled="${m.role === "moderator" ? "0" : "1"}">${m.role === "moderator" ? "মডারেটর সরান" : "মডারেটর করুন"}</button>` : ""}</div></div>`,
      )
      .join("");
    $("#locks").innerHTML = Array.from({ length: r.seatCount }, (_, i) => i + 1)
      .filter((s) => !activeRoom?.seats?.[s])
      .map(
        (s) =>
          `<button class="b mini" data-lock="${s}">${s} ${activeRoom?.lockedSeats?.includes(s) ? "🔒" : "🔓"}</button>`,
      )
      .join("");
    bind("[data-manage]", async (el) => {
      await api("manageRoom", {
        roomId: r.id,
        action: el.dataset.manage,
        targetUid: el.dataset.target,
        muted: el.dataset.enabled === "1",
        enabled: el.dataset.enabled === "1",
      });
      toast("অনুমতি আপডেট হয়েছে");
    });
    bind("[data-lock]", async (el) => {
      const seat = Number(el.dataset.lock);
      await api("manageRoom", {
        roomId: r.id,
        action: "lock",
        seat,
        locked: !activeRoom?.lockedSeats?.includes(seat),
      });
    });
  };
  pageStops.push(
    onSnapshot(collection(db, "rooms", r.id, "members"), () => draw(), report),
  );
  pageStops.push(onSnapshot(doc(db, "rooms", r.id), () => draw(), report));
  pageStops.push(
    onSnapshot(
      collection(db, "rooms", r.id, "requests"),
      (s) => {
        seatRequests = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!$("#requests")) return;
        $("#requests").innerHTML =
          seatRequests
            .map(
              (q) =>
                `<div class="message">${esc(q.name)} • সিট ${q.seat}<div class="room-actions"><button class="b t mini" data-approve="${q.id}">অনুমতি দিন</button><button class="b r mini" data-reject="${q.id}">না</button></div></div>`,
            )
            .join("") || '<p class="muted">অনুরোধ নেই</p>';
        for (const action of ["approve", "reject"])
          bind(`[data-${action}]`, async (el) => {
            await api("manageRoom", {
              roomId: r.id,
              action,
              targetUid: el.dataset[action],
            });
          });
      },
      report,
    ),
  );
  draw();
}
function gifts(target = "") {
  if (!activeRoom) return;
  const eligible = members.filter(
      (m) => m.active && !m.banned && m.id !== auth.currentUser?.uid,
    ),
    giftList = Object.values(C.GFT).flat();
  let selected = 0,
    key = requestId();
  sheet(
    "🎁 গিফট পাঠান",
    `<p class="muted">🪙 ${fmt(profile!.coins)} • প্রাপক পাবেন মূল্যের ৭০% কয়েন</p><select class="in" id="gift-to">${eligible.map((m) => `<option value="${m.id}" ${target === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select><div class="gg" style="margin:14px 0">${giftList.map((g, i) => `<button class="gi3 ${i === 0 ? "on" : ""}" data-gift="${i}"><b>${g[0]}</b>${esc(g[1])}<br>🪙 ${fmt(g[2])}</button>`).join("")}</div><div class="row"><input class="in" type="number" id="gift-qty" min="1" max="99" value="1"><button class="b g" id="gift-send" ${eligible.length ? "" : "disabled"}>পাঠান</button></div>`,
  );
  bind("[data-gift]", (el) => {
    selected = Number(el.dataset.gift);
    document
      .querySelectorAll("[data-gift]")
      .forEach((e) => e.classList.toggle("on", e === el));
  });
  bind("#gift-send", async () => {
    await api("sendCatalogGift", {
      roomId: activeRoom!.id,
      targetUid: val("#gift-to"),
      index: selected,
      quantity: Number(val("#gift-qty")),
      requestId: key,
    });
    key = requestId();
    toast("গিফট পাঠানো হয়েছে");
    $("#sh").classList.remove("on");
  });
}
function openGame(key: string) {
  if (!games.some((g) => g[2] === key)) return;
  if (!guest && !need()) return;
  const verified=!!profile;
  gameKey = key;
  gameRanking=[];
  gameBusy = false;
  $("#gm").classList.add("on");
  $("#gm").innerHTML =
    `<div class="gamebar"><button class="b mini" id="close-game">‹ ফিরুন</button><span class="sp">${esc(games.find((g) => g[2] === key)![1])}</span><span>🪙 <b data-balance>${verified?fmt(profile!.coins):"ডেমো"}</b></span></div>${!verified?'<div class="gamebar">প্রিভিউয়ের কয়েন আসল ওয়ালেটে যোগ হয় না</div>':""}<iframe title="${esc(games.find((g) => g[2] === key)![1])}" sandbox="allow-scripts allow-same-origin" src="${import.meta.env.BASE_URL}games/${key}.html"></iframe>`;
  frame = $("#gm iframe") as HTMLIFrameElement;
  frame.onload = () => {
    if(gameRanking.length)frame?.contentWindow?.postMessage({type:"setRanking",list:gameRanking},location.origin);
    frame?.contentWindow?.postMessage(
      {
        type: "setUser",
        name: profile?.displayName,
        avatar: profile?.avatarUrl,
        verified,
      },
      location.origin,
    );
    frame?.contentWindow?.postMessage(
      { type: "setBalance", balance: verified?(profile?.coins || 0):1000000 },
      location.origin,
    );
  };
  if(profile){const rankingFrame=frame;gameStop=onSnapshot(query(collection(db,'gameRankings'),where('day','==',new Date().toISOString().slice(0,10)),orderBy('todayWon','desc'),limit(10)),snapshot=>{const list=snapshot.docs.map(d=>({name:d.data().userName,avatar:d.data().userAvatar,amount:d.data().todayWon}));gameRanking=list;rankingFrame?.contentWindow?.postMessage({type:'setRanking',list},location.origin);},console.warn);}
  bind("#close-game", closeGame);
}
let gameStop:(()=>void)|null=null;
let gameRanking:Row[]=[];
function closeGame() {
  gameStop?.();gameStop=null;
  if (gameBusy) {
    toast("অপেক্ষমাণ রাউন্ডের ফল পরে ওয়ালেট ও ইতিহাসে দেখাবে");
  }
  $("#gm").classList.remove("on");
  $("#gm").innerHTML = "";
  frame = null;
  gameKey = "";
}
window.addEventListener("message", async (e) => {
  if (
    e.origin !== location.origin ||
    !frame ||
    e.source !== frame.contentWindow
  )
    return;
  const d = e.data || {};
  if (d.type === "roundComplete") {
    gameBusy = false;
    return;
  }
  if (d.type === "exit") {
    closeGame();
    return;
  }
  if (
    d.type === "roundRequest" &&
    !!profile &&
    typeof d.requestId === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(d.requestId) &&
    Array.isArray(d.bets)
  ) {
    const target = e.source as Window,
      roundKey = gameKey + ":" + d.requestId;
    gameBusy = true;
    try {
      let work = rounds.get(roundKey);
      if (!work) {
        work = api("playRound", {
          requestId: d.requestId,
          game: gameKey,
          bets: d.bets,
        });
        rounds.set(roundKey, work);
      }
      const result = await work;
      target.postMessage(
        { type: "roundResult", requestId: d.requestId, result },
        location.origin,
      );
      if (rounds.size > 200) rounds.delete(rounds.keys().next().value!);
    } catch (err: any) {
      rounds.delete(roundKey);
      const terminal = ![
        "functions/unavailable",
        "functions/deadline-exceeded",
        "functions/internal",
      ].includes(err.code);
      target.postMessage(
        {
          type: "roundResult",
          requestId: d.requestId,
          error: terminal
            ? err.message
            : "সার্ভারের উত্তর অপেক্ষমাণ — আবার চেষ্টা হচ্ছে…",
          terminal,
        },
        location.origin,
      );
      if (terminal) gameBusy = false;
    }
  }
});
function login() {
  closePage();
  $("#nav").innerHTML = "";
  $("#main").innerHTML =
    `<div class="login-logo">🎙️</div><div class="t3">Shakil M<br>Voice Rooms</div><p class="muted" style="text-align:center;margin:20px 0">বন্ধু • আড্ডা • গেমস • একটি ওয়ালেট</p><form class="gl card stack" id="login-form"><h3>আপনার অ্যাকাউন্টে স্বাগতম</h3><label>ইমেইল<input class="in" id="email" type="email" autocomplete="email" required></label><label>পাসওয়ার্ড<input class="in" id="password" type="password" autocomplete="current-password" minlength="6" required></label><button class="b t" type="submit">লগইন</button><button class="b" id="register" type="button">নতুন অ্যাকাউন্ট</button><button class="b g" id="google" type="button">Google দিয়ে প্রবেশ</button><button style="background:none;color:#bff" id="reset" type="button">পাসওয়ার্ড ভুলে গেছেন?</button><div class="error" id="login-error" hidden></div></form><button class="b full" id="preview">আগে ডিজাইন দেখুন →</button>`;
  const run = async (fn: () => Promise<any>) => {
    const el = $("#login-error");
    el.hidden = true;
    try {
      await fn();
    } catch (e: any) {
      el.hidden = false;
      el.textContent = e.message;
    }
  };
  $("#login-form").onsubmit = (e) => {
    e.preventDefault();
    void run(() =>
      signInWithEmailAndPassword(auth, val("#email"), val("#password")),
    );
  };
  bind("#google", () => run(() => signInWithPopup(auth, googleProvider)));
  bind("#register", () =>
    run(async () => {
      const result = await createUserWithEmailAndPassword(
        auth,
        val("#email"),
        val("#password"),
      );
      await sendEmailVerification(result.user);
      toast("অ্যাকাউন্ট হয়েছে; ইমেইল যাচাইয়ের লিংক পাঠানো হয়েছে");
    }),
  );
  bind("#reset", () =>
    run(async () => {
      await sendPasswordResetEmail(auth, val("#email"));
      toast("পাসওয়ার্ড রিসেটের ইমেইল দেখুন");
    }),
  );
  bind("#preview", () => {
    guest = true;
    render();
  });
}
let authSession = 0;
async function bootstrap() {
  const u = auth.currentUser;
  if (!u) return;
  const session = authSession;
  error = "";
  try {
    await api("bootstrapUser", { ref: referral });
    if (session !== authSession) return;
    error = "";
    sessionStorage.removeItem("referral");
    render();
  } catch (e: any) {
    if (session !== authSession) return;
    error =
      "অ্যাকাউন্ট সার্ভার সংযুক্ত হয়নি। Firebase Functions ও Rules ডিপ্লয়/কনফিগারেশন প্রয়োজন। " +
      String(e.message || "");
    render();
  }
}
onAuthStateChanged(auth, async (user) => {
  const session = ++authSession;
  authReady = true;
  globalStops.splice(0).forEach((f) => f());
  closePage();
  await exitRoom();
  if (frame) {
    gameBusy = false;
    closeGame();
  }
  profile = null;
  owner = false;
  posts = [];
  dm = [];
  error = "";
  guest = false;
  if (!user) {
    render();
    return;
  }
  try {
    owner = (await user.getIdTokenResult()).claims.superAdmin === true;
  } catch {}
  if (session !== authSession) return;
  render();
  await bootstrap();
  if (session !== authSession) return;
  globalStops.push(
    onSnapshot(
      doc(db, "users", user.uid),
      (s) => {
        if (session !== authSession) return;
        profile = s.exists() ? s.data() : null;
        document
          .querySelectorAll("[data-balance]")
          .forEach((el) => (el.textContent = fmt(profile?.coins)));
        if (
          !$("#pg").classList.contains("on") &&
          !$("#ov").classList.contains("on")
        )
          render();
      },
      (e) => {
        error = e.message;
        render();
      },
    ),
  );
  globalStops.push(
    onSnapshot(
      query(collection(db, "moments"), orderBy("createdAt", "desc"), limit(40)),
      (s) => {
        posts = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (tab === "moments") render();
      },
      report,
    ),
  );
  globalStops.push(
    onSnapshot(
      query(
        collection(db, "directMessages"),
        where("participants", "array-contains", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      ),
      (s) => {
        dm = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (tab === "msg") render();
      },
      report,
    ),
  );
  const rid = new URL(location.href).searchParams.get("room");
  if (rid && /^[a-zA-Z0-9_-]{1,128}$/.test(rid)) {
    const unsub = onSnapshot(doc(db, "users", user.uid), (s) => {
      if (s.exists()) {
        unsub();
        profile = s.data();
        void enterRoom(rid).catch(report);
      }
    });
    globalStops.push(unsub);
  }
});
onSnapshot(
  query(collection(db, "rooms"), where("isPrivate", "==", false), limit(60)),
  (s) => {
    rooms = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (authReady && tab === "home") render();
  },
  () => {
    error = "রুমের সার্ভারে সংযোগ পাওয়া যায়নি। আবার চেষ্টা করুন।";
    if (authReady) render();
  },
);
window.addEventListener("pagehide", () => voice?.destroy());
