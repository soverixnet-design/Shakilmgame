import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
export const GameRankingModal = ({ gameTitle, onClose }: { gameTitle: string; onClose: () => void }) => {
 const [rows,setRows] = useState<any[]>([]);
 const [status,setStatus] = useState('লোড হচ্ছে…');
 useEffect(() => onSnapshot(query(collection(db,'gameRankings'),orderBy('todayWon','desc'),limit(50)), snap=>{
  const day = new Date().toISOString().slice(0,10);
  setRows(snap.docs.map(d=>({id:d.id,...d.data()})).filter((d:any)=>d.day===day)); setStatus('আজকের যাচাইকৃত ফলাফল এখনও নেই।');
 },()=>setStatus('র‍্যাঙ্কিং লোড করা যায়নি।')),[]);
 return <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"><div className="bg-[#251552] rounded-2xl p-5 w-full max-w-md text-white"><h3 className="text-xl font-bold">🏆 {gameTitle}</h3><p className="text-xs my-2">সার্ভারে যাচাইকৃত ফলাফল • দিন গণনা UTC অনুযায়ী</p><div className="max-h-[60vh] overflow-auto">{rows.length?rows.map((r,i)=><div className="flex justify-between border-b border-white/10 py-3" key={r.id}><span>#{i+1} {r.userName}</span><span>{Number(r.todayWon||0).toLocaleString()}</span></div>):<p className="py-6">{status}</p>}</div><button className="mt-3 w-full bg-amber-400 text-black rounded-xl p-2" onClick={onClose}>বন্ধ করুন</button></div></div>;
};
