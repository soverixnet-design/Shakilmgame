import React from 'react';
import { X } from 'lucide-react';

interface GameRulesModalProps {
  gameType: 'night_food' | 'lion_food' | 'slots' | 'jackpot_fruit';
  onClose: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ gameType, onClose }) => {
  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-gradient-to-b from-[#1b123d] to-[#0d0720] border-2 border-amber-400/80 rounded-2xl shadow-[0_0_40px_rgba(255,184,0,0.3)] p-5 text-white overflow-hidden animate-in">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="font-extrabold text-[18px] text-amber-300 flex items-center gap-2">
            📖 খেলার নিয়ম ও সম্ভাবনা
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-4 text-[13px] leading-relaxed text-white/90">
          {gameType === 'night_food' && (
            <>
              <div>
                <h4 className="font-bold text-amber-300 text-[15px] mb-1">🎡 নাইট ফুড হুইল কীভাবে খেলবেন</h4>
                <p className="text-white/80">
                  ১. যেকোনো চিপ বেছে পছন্দের খাবারের ঘরে ট্যাপ করে বেট ধরুন। একই ঘরে বারবার ট্যাপ করে বেট বাড়ানো যায়।<br />
                  ২. ২০ সেকেন্ড কাউন্টডাউন শেষে রাতের চাকা ঘুরবে এবং একটি নির্দিষ্ট খাবার নির্বাচিত হবে।<br />
                  ৩. আপনার নির্বাচিত খাবারে চাকা থামলে: <b>বেট × গুণক কয়েন</b> জিতে সরাসরি আপনার মেইন ওয়ালেটে জমা হবে।<br />
                  ৪. <b>🥗 সালাদ</b> এ বেট ধরলে যেকোনো x5 খাবার এলে <b>x1.2</b> গুণ পাবেন। <b>🍕 পিজা</b> এ বেট ধরলে যেকোনো x10 বা বেশি খাবারের জন্য <b>x4</b> গুণ পাবেন।<br />
                  ৫. ▶ অটো প্লে চালু রাখলে আগের রাউন্ডের বেটগুলো স্বয়ংক্রিয়ভাবে খেলা চালিয়ে যাবে।
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-300 text-[14px] mb-2">গুণক ও জয়ের হিসাব</h4>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🥩 স্টেক</span><b className="text-amber-300">x45 · 2.2%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🍗 চিকেন</span><b className="text-amber-300">x25 · 3.9%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🍢 শিক কাবাব</span><b className="text-amber-300">x15 · 6.5%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🌭 হটডগ</span><b className="text-amber-300">x10 · 9.7%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🥕 গাজর</span><b className="text-amber-300">x5 · 19.4%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🌽 ভুট্টা</span><b className="text-amber-300">x5 · 19.4%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🥬 সালাদ পাতা</span><b className="text-amber-300">x5 · 19.4%</b>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between">
                    <span>🍅 টমেটো</span><b className="text-amber-300">x5 · 19.4%</b>
                  </div>
                </div>
              </div>
            </>
          )}

          {gameType === 'lion_food' && (
            <>
              <div>
                <h4 className="font-bold text-amber-300 text-[15px] mb-1">🦁 সিংহ ফুড হুইল নিয়ম</h4>
                <p className="text-white/80">
                  ১. সিংহের দরবারে পছন্দের খাবারে চিপ রেখে বেট প্লেস করুন।<br />
                  ২. ২০ সেকেন্ডের ব্যবধানে চাকা ঘুরবে। চাকা যার ঘরে থামবে সে জয়ী হবে।<br />
                  ৩. <b>🍗 চিকেন x45</b>, <b>🐙 অক্টোপাস x25</b>, <b>🐟 মাছ x15</b>, <b>🥩 স্টেক x10</b>!<br />
                  ৪. <b>🥗 সালাদ</b> ও <b>🍕 পিজা</b> গ্রুপ বেটে বড় অঙ্কের জয় নিশ্চিত করার সুযোগ রয়েছে।<br />
                  ৫. জয়ের কয়েন তাৎক্ষণিকভাবে আপনার অ্যাকাউন্টের ওয়ালেটে যুক্ত হবে এবং এটি দিয়ে ভয়েস রুমে গিফট পাঠাতে পারবেন!
                </p>
              </div>
            </>
          )}

          {gameType === 'slots' && (
            <>
              <div>
                <h4 className="font-bold text-amber-300 text-[15px] mb-1">🎰 ৩-রিল ক্লাসিক স্লটস নিয়ম</h4>
                <p className="text-white/80">
                  ১. <b>−</b> ও <b>+</b> দিয়ে আপনার স্পিন বেট নির্ধারণ করুন, এরপর <b>SPIN</b> চাপুন।<br />
                  ২. মাঝের গোল্ডেন পে-লাইনে বামদিক থেকে পরপর ২টি বা ৩টি একই চিহ্ন মিলে গেলে জয়!<br />
                  ৩. ৩টি <b>7️⃣7️⃣7️⃣</b> মিললে সর্বোচ্চ <b>x70</b> গুণ কয়েন জ্যাকপট!<br />
                  ৪. ৩টি যেকোনো ধরনের BAR (BAR³ + BAR² + BAR) মিললে <b>x4.5</b> মিশ্র বোনাস পে।<br />
                  ৫. SPIN বাটন চেপে রাখলে (HOLD) অটো স্পিন সক্রিয় হয়। ⚡ Fast বাটনে রিল দ্রুত ঘোরে।
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-300 text-[14px] mb-2">পে-টেবিল (Paytable)</h4>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>7️⃣ 7️⃣ 7️⃣</span><b className="text-amber-300">x70</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>BAR³ BAR³ BAR³</span><b className="text-amber-300">x20</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>BAR² BAR² BAR²</span><b className="text-amber-300">x15</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>BAR BAR BAR</span><b className="text-amber-300">x12</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>🔔 🔔 🔔</span><b className="text-amber-300">x10</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>🍇 🍇 🍇</span><b className="text-amber-300">x7</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>🍊 🍊 🍊</span><b className="text-amber-300">x6</b></div>
                  <div className="bg-white/5 rounded p-2 flex justify-between"><span>🍒 🍒 🍒</span><b className="text-amber-300">x5</b></div>
                </div>
              </div>
            </>
          )}

          {gameType === 'jackpot_fruit' && (
            <>
              <div>
                <h4 className="font-bold text-amber-300 text-[15px] mb-1">🍓 জ্যাকপট ফ্রুট নিয়ম</h4>
                <p className="text-white/80">
                  ১. চিপ বেছে নিয়ে ফলের ঘরে ট্যাপ করে বেট ধরুন। ২০ সেকেন্ড পর ফল ঠিক হবে।<br />
                  ২. যে ফল আসবে তাতে বেট ধরা থাকলে <b>বেট × ফলের গুণক</b> কয়েন পাবেন। (🍒 চেরি x40, 🍉 তরমুজ x20)।<br />
                  ৩. ওপরের ৩ ঘরের মিনি-স্লটে বোনাস আসতে পারে: <b>+1 / +2</b> অতিরিক্ত ফল, <b>x2 / x3</b> জয় মাল্টিপ্লায়ার, অথবা সরাসরি <b>JACKPOT</b>!<br />
                  ৪. জ্যাকপট পুল প্রতি বেটে বৃদ্ধি পায়। JACKPOT লাগলে রাউন্ড খরচের ওপর ভিত্তি করে পুলের ১০% থেকে ৭০% একবারে জয়ী হবেন!
                </p>
              </div>
            </>
          )}

          <p className="text-[11px] text-white/50 pt-2 border-t border-white/10">
            * নোট: সমস্ত গেমের ফলাফল গাণিতিক প্রবাবিলিটি দ্বারা চালিত। ওয়ালেটের ব্যালেন্স ও গেম ব্যালেন্স রিয়েলটাইমে সিঙ্ক থাকে। দায়িত্ব নিয়ে আনন্দ উপভোগ করুন।
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg active:scale-98 transition"
        >
          বুঝেছি, খেলায় ফিরুন
        </button>
      </div>
    </div>
  );
};
