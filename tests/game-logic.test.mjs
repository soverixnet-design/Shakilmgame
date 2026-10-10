import test from 'node:test';
import assert from 'node:assert/strict';
import { settle } from '../functions/game-logic.js';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
for(const game of ['night_food','lion_food','slots','jackpot_fruit']) {
 test(`${game}: reject invalid or empty stakes`,()=>{
  for(const bets of [[],[-1],[NaN],[Infinity],[0],[1.5],[1000000001]])assert.throws(()=>settle(game,bets));
 });
 test(`${game}: valid outcomes conserve a finite integer wallet`,()=>{
  const bets=game==='slots'?[1000]:game==='jackpot_fruit'?[100,100,100,100,0,100,100,100,100]:Array(10).fill(100);
  for(let i=0;i<1000;i++){
   const r=settle(game,bets);
   assert.equal(r.cost,bets.reduce((a,b)=>a+b,0));
   assert.ok(Number.isSafeInteger(r.win)&&r.win>=0);
   assert.ok(Number.isSafeInteger(r.pool)&&r.pool>=0);
   if(game.endsWith('food')){
    const multipliers=game==='night_food'?[10,15,25,45,5,5,5,5]:[45,25,15,10,5,5,5,5];
    const m=multipliers[r.results[0]];
    assert.equal(r.win,Math.floor(100*m+(m===5?120:400)));
   }
  }
 });
}
test('unknown games and unavailable fruit cell rejected',()=>{
 assert.throws(()=>settle('unknown',[100]));assert.throws(()=>settle('jackpot_fruit',Array(9).fill(100)));
});
test('all embedded game scripts parse and enforce sender checks',()=>{
 for(const file of readdirSync('public/games')){
  const html=readFileSync('public/games/'+file,'utf8');
  for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  assert.ok(html.includes('e.source!==parent')&&html.includes('e.origin!==location.origin'));
  assert.ok(html.includes('requestRound'));
 }
});
