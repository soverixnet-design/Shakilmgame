import React, { useEffect, useState } from 'react';
import { X, History, TrendingUp, TrendingDown } from 'lucide-react';
import { GameRoundRecord } from '../../types';

interface GameHistoryModalProps {
  gameType: string;
  gameTitle: string;
  onClose: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ gameType, gameTitle, onClose }) => {
  const [history, setHistory] = useState<GameRoundRecord[]>([]);

  useEffect(() => {
    try {
      const key = `hist_${gameType}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        // Sample recent history if none yet
        const samples: GameRoundRecord[] = [
          {
            id: '1',
            gameType: gameType as any,
            userId: 'user',
            userName: 'You',
            userAvatar: '😎',
            roundNumber: 128,
            result: '🥩',
            betAmount: 10000,
            winAmount: 450000,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            gameType: gameType as any,
            userId: 'user',
            userName: 'You',
            userAvatar: '😎',
            roundNumber: 127,
            result: '🥕',
            betAmount: 50000,
            winAmount: 0,
            createdAt: new Date(Date.now() - 30000).toISOString(),
          },
          {
            id: '3',
            gameType: gameType as any,
            userId: 'user',
            userName: 'You',
            userAvatar: '😎',
            roundNumber: 126,
            result: '🍗',
            betAmount: 20000,
            winAmount: 500000,
            createdAt: new Date(Date.now() - 60000).toISOString(),
          },
        ];
        setHistory(samples);
      }
    } catch {}
  }, [gameType]);

  const totalWon = history.reduce((acc, h) => acc + h.winAmount, 0);
  const totalBet = history.reduce((acc, h) => acc + h.betAmount, 0);

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-gradient-to-b from-[#23184d] to-[#120a2e] border-2 border-[#7C4DFF]/60 rounded-2xl shadow-[0_0_40px_rgba(124,77,255,0.4)] p-5 text-white overflow-hidden animate-in">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#7C4DFF]/20 flex items-center justify-center text-[#00E5FF]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-[16px] text-amber-300">
                📜 গেমের হিস্ট্রি
              </h3>
              <p className="text-[11px] text-white/50">{gameTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-white/50 block">মোট খরচ</span>
            <span className="text-[14px] font-bold text-white">🪙 {totalBet.toLocaleString()}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-white/50 block">মোট প্রাপ্তি</span>
            <span className="text-[14px] font-bold text-emerald-400">🪙 {totalWon.toLocaleString()}</span>
          </div>
        </div>

        {/* History table */}
        <div className="overflow-y-auto flex-1 py-1 space-y-1.5 scrollbar-hide">
          {history.length > 0 ? (
            history.map((item, idx) => {
              const isProfit = item.winAmount > item.betAmount;
              const isZero = item.winAmount === 0;

              return (
                <div
                  key={item.id || idx}
                  className="bg-white/[0.04] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-[12px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-white/70 text-[11px]">
                      #{item.roundNumber}
                    </span>
                    <span className="text-[20px]">{item.result}</span>
                    <div>
                      <span className="text-white/40 block text-[10px]">খরচ: 🪙 {item.betAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold flex items-center gap-1 justify-end ${
                        isProfit ? 'text-emerald-400' : isZero ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {item.winAmount > 0 ? `+${item.winAmount.toLocaleString()}` : '0'}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {isProfit ? 'জয় 🎉' : isZero ? 'পরাজয় ❌' : 'ফেরত'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-white/40 text-[13px]">
              এখনও কোনো রাউন্ড খেলা হয়নি
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl font-bold text-[14px] bg-[#7C4DFF] hover:bg-[#6c3df0] text-white shadow-lg active:scale-98 transition"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
