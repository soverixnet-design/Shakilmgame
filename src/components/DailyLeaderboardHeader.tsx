import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
export const DailyLeaderboardHeader = () => {
 const [rows,setRows]=useState<any[]>([]);
 useEffect(()=>onSnapshot(query(collection(db,'giftRankings'),where('day','==',new Date().toISOString().slice(0,10))),snap=>setRows(snap.docs.map(d=>d.data()).sort((a,b)=>b.sent-a.sent).slice(0,3)),()=>setRows([])),[]);
 return <section className="mx-4 my-3 rounded-xl border border-amber-400/20 bg-white/5 p-3"><h3 className="font-bold text-amber-300">🏆 আজকের গিফট লিডারবোর্ড</h3>{rows.length?rows.map((r,i)=><div className="flex justify-between text-sm mt-2" key={r.uid}><span>{i+1}. {r.name}</span><span>🪙 {Number(r.sent).toLocaleString()}</span></div>):<p className="text-xs text-white/50 mt-2">আজকের যাচাইকৃত গিফট রেকর্ড এখনও নেই।</p>}</section>;
};
