import React, { useState } from 'react';
import { Gamepad2, Trophy, Coins, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/SettingsContext';
import { OriginalGameEmbed } from './OriginalGameEmbed';
import { GameRankingModal } from './GameRankingModal';

type ActiveGamePath = { path: string; title: string } | null;

export const GameHub: React.FC = () => {
  const { profile, addDemoCoins } = useAuth();
  const { settings } = useAppSettings();
  const [activeGame, setActiveGame] = useState<ActiveGamePath>(null);
  const [showGlobalRanking, setShowGlobalRanking] = useState<boolean>(false);

  if (activeGame) {
    return (
      <OriginalGameEmbed
        gamePath={activeGame.path}
        title={activeGame.title}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  const enabledGames = settings.games.filter((g) => g.enabled);

  return (
    <div className="pb-24 px-4 pt-3 space-y-4">
      {/* Wallet Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1E1E35] via-[#2A1D4E] to-[#18182E] border border-white/10 p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-[24px] shadow-[0_4px_16px_rgba(251,191,36,0.3)]">
            🪙
          </div>
          <div>
            <span className="text-[11px] text-white/50 font-bold block uppercase tracking-wider">
              গেম ও মেইন ওয়ালেট ব্যালেন্স
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-black text-amber-300">
                🪙 {profile.coins.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              আজকের জয়: 🪙 {profile.todayWon.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full font-bold border border-amber-400/20 block mb-1">
            অফিশিয়াল ওয়ালেট
          </span>
          <span className="text-[11px] text-white/50">লাইভ ব্যালেন্স</span>
        </div>
      </div>

      {/* Top 3 Teaser Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-[17px] text-white flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          গেমিং কর্নার ({enabledGames.length}টি মূল গেম)
        </h2>
        <button
          onClick={() => setShowGlobalRanking(true)}
          className="flex items-center gap-1 text-[12px] font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 active:scale-95"
        >
          <Trophy className="w-3.5 h-3.5" />
          শীর্ষ ৩ বিজয়ী
        </button>
      </div>

      {/* Game Cards Grid (Dynamic from Settings) */}
      <div className="grid gap-3.5">
        {enabledGames.map((game) => (
          <div
            key={game.id}
            className="rounded-2xl bg-gradient-to-br from-[#2a1352] via-[#1a0b36] to-[#0c041c] border-2 border-amber-400/60 p-4 shadow-xl relative overflow-hidden flex flex-col justify-between group transition hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 text-amber-200 border border-white/20 inline-block mb-1.5 shadow-sm">
                  {game.badge}
                </span>
                <h3 className="font-black text-[20px] text-white leading-tight">
                  {game.title}
                </h3>
                <p className="text-[11px] text-white/50">{game.titleEn}</p>
              </div>

              {/* Dynamic Game Logo / Icon */}
              <div className="w-14 h-14 rounded-2xl bg-black/40 border border-amber-400/40 flex items-center justify-center text-[30px] shadow-inner">
                {game.icon}
              </div>
            </div>

            <p className="text-[12px] text-amber-200/90 font-medium my-2.5 bg-black/25 p-2 rounded-xl border border-white/5">
              {game.payoutDesc}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                অনলাইন খেলোয়াড় সক্রিয়
              </span>

              <button
                onClick={() => setActiveGame({ path: game.path, title: game.title })}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-900 font-black text-[13px] shadow-[0_4px_14px_rgba(251,191,36,0.4)] active:scale-95 transition"
              >
                এখন খেলুন ▶
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Ranking Modal */}
      {showGlobalRanking && (
        <GameRankingModal
          gameTitle="সর্বমোট গেমসের র‍্যাঙ্কিং"
          onClose={() => setShowGlobalRanking(false)}
        />
      )}
    </div>
  );
};
