import { randomInt } from 'node:crypto';
const random = () => randomInt(0, 1000000000) / 1000000000;
function weighted(values, weights) { let n=random()*weights.reduce((a,b)=>a+b,0); for(let i=0;i<values.length;i++)if((n-=weights[i])<0)return values[i];return values.at(-1); }
export function settle(game, bets, pool=21817399) {
 if(!Array.isArray(bets)||bets.some(v=>!Number.isSafeInteger(v)||v<0||v>1000000000))throw new Error('Invalid bets');
 const cost=bets.reduce((a,b)=>a+b,0);if(cost<=0||cost>1000000000)throw new Error('Invalid total');
 let results=[],bonus='',win=0,nextPool=pool;
 if(game==='slots') {
  if(bets.length!==1)throw new Error('Invalid slots bet');
  const keys=['7','B3','B2','B1','BL','GR','OR','CH'];
  results=Array.from({length:3},()=>weighted(keys,[2,3,4,6,10,22,34,50]));
  const triple=[70,20,15,12,10,7,6,5],double=[6,5,4,3.5,3,3,3,2.5];
  const [a,b,c]=results;
  const multiplier=a===b&&b===c?triple[keys.indexOf(a)]:results.every(x=>['B3','B2','B1'].includes(x))?4.5:a===b?double[keys.indexOf(a)]:0;
  win=Math.round(multiplier*cost);
 } else if(game==='night_food'||game==='lion_food') {
  if(bets.length!==10)throw new Error('Invalid wheel bet');
  const multipliers=game==='night_food'?[10,15,25,45,5,5,5,5]:[45,25,15,10,5,5,5,5];
  const result=weighted([0,1,2,3,4,5,6,7],multipliers.map(m=>1/m));results=[result];
  win=Math.floor(bets[result]*multipliers[result]+(multipliers[result]===5?bets[8]*1.2:bets[9]*4));
 } else if(game==='jackpot_fruit') {
  if(bets.length!==9||bets[4]!==0)throw new Error('Invalid fruit bet');
  const keys=[0,1,2,5,8,7,6,3],multipliers=[5,5,5,40,0,5,20,10,10];
  const pick=()=>weighted(keys,keys.map(k=>1/multipliers[k]));
  const n=random();bonus=n<.9?'':n<.94?'+1':n<.96?'+2':n<.985?'x2':n<.995?'x3':'JP';
  results=Array.from({length:bonus==='+1'?2:bonus==='+2'?3:1},pick);
  win=Math.floor(results.reduce((sum,k)=>sum+bets[k]*multipliers[k],0)*(bonus==='x2'?2:bonus==='x3'?3:1));
  nextPool+=Math.floor(cost*.05);
  if(bonus==='JP'&&cost>=1000){const amount=Math.floor(nextPool*(cost>=1e6?.7:cost>=1e5?.5:cost>=1e4?.3:.1));win+=amount;nextPool-=amount;}
 } else throw new Error('Unknown game');
 return {cost,win,results,bonus,pool:nextPool};
}
