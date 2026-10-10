import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, Sparkles, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OriginalGameEmbedProps {
  gamePath: string; // e.g. '/games/jackpot_fruit.html'
  title: string;
  onBack: () => void;
}

export const OriginalGameEmbed: React.FC<OriginalGameEmbedProps> = ({
  gamePath,
  title,
  onBack,
}) => {
  const { profile, adjustCoins } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const coinsRef = useRef(profile.coins);
  coinsRef.current = profile.coins;

  // 5-second loading state as requested: "যে কোন গেমসে ঢোকার আগে ৫ সেকেন্ড লোডিং নিবে"
  const [loadingCountdown, setLoadingCountdown] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsLoading(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Send balance and user to iframe when ready
  const syncWithIframe = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'setBalance', balance: coinsRef.current },
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'setUser',
          name: profile.displayName,
          avatar: profile.avatarUrl,
        },
        '*'
      );
    }
  };

  useEffect(() => {
    if (!isLoading) {
      syncWithIframe();
    }
  }, [profile.coins, profile.displayName, profile.avatarUrl, isLoading]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'wallet' && typeof e.data.balance === 'number') {
        const delta = e.data.balance - coinsRef.current;
        if (delta !== 0) {
          adjustCoins(delta, delta > 0 ? delta : 0);
        }
      }

      if (e.data.type === 'exit') {
        onBack();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Top Navbar */}
      <div className="bg-[#100726] border-b border-white/10 px-4 py-2.5 flex items-center justify-between z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[12px] active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ভয়েস রুমে ফিরুন</span>
        </button>

        <h3 className="font-extrabold text-[14px] text-amber-300 truncate max-w-[150px]">
          {title}
        </h3>

        {/* Clean Wallet Coins Display (No free coins button as requested!) */}
        <div className="flex items-center gap-1.5 bg-black/50 border border-amber-400/30 px-3 py-1 rounded-full text-[12px] text-amber-300 font-extrabold">
          <Coins className="w-3.5 h-3.5" />
          <span>
            {profile.coins >= 1000000
              ? (profile.coins / 1000000).toFixed(2) + 'M'
              : profile.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5-SECOND GAME LOADING SCREEN */}
      {isLoading ? (
        <div className="flex-1 w-full bg-gradient-to-b from-[#1a0a38] via-[#0f0426] to-[#060212] flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
          {/* Animated decorative glow */}
          <div className="w-64 h-64 bg-amber-400/10 rounded-full blur-3xl absolute pointer-events-none" />

          <div className="relative z-10 space-y-5 max-w-xs w-full">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 p-1 shadow-[0_0_40px_rgba(251,191,36,0.4)] animate-bounce">
              <div className="w-full h-full rounded-[22px] bg-[#12072a] flex items-center justify-center text-[44px]">
                🎮
              </div>
            </div>

            <div>
              <h2 className="text-[22px] font-black text-amber-300 tracking-tight">
                {title}
              </h2>
              <p className="text-[12px] text-white/60 mt-1">
                গেম সার্ভারের সাথে কয়েন সিঙ্ক হচ্ছে...
              </p>
            </div>

            {/* Countdown Badge & Progress Bar */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-[14px]">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{loadingCountdown} সেকেন্ডে শুরু হচ্ছে...</span>
              </div>

              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((5 - loadingCountdown + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-white/40">
              💡 আপনি জিতে গেলে উইনিং কয়েন সরাসরি আপনার ওয়ালেটে যুক্ত হবে
            </p>
          </div>
        </div>
      ) : (
        /* Embedded 100% Original HTML Game in Iframe */
        <iframe
          ref={iframeRef}
          src={gamePath}
          onLoad={syncWithIframe}
          className="flex-1 w-full h-full border-0 bg-transparent"
          title={title}
          allow="autoplay"
        />
      )}
    </div>
  );
};
