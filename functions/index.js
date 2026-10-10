import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
initializeApp();
const databaseId = defineString('FIRESTORE_DATABASE_ID', { default: '(default)' });
const db = () => getFirestore(databaseId.value());
const uidOf = r => { if (!r.auth) throw new HttpsError('unauthenticated','Sign in required'); return r.auth.uid; };
const admin = r => { const uid=uidOf(r); if(r.auth.token.admin!==true) throw new HttpsError('permission-denied','Admin required'); return uid; };
const id = value => { if(typeof value!=='string'||!value.match(/^[a-zA-Z0-9_-]{1,128}$/)) throw new HttpsError('invalid-argument','Invalid ID'); return value; };
const integer = n => { if(!Number.isSafeInteger(n)||n<=0||n>1000000000) throw new HttpsError('invalid-argument','Invalid amount'); return n; };
export const sendGift = onCall(async r => {
 const uid=uidOf(r), target=id(r.data.targetUid), requestId=id(r.data.requestId), giftId=id(r.data.giftId);
 if(uid===target) throw new HttpsError('invalid-argument','Cannot gift yourself');
 return db().runTransaction(async tx=>{
  const receipt=db().doc(`transactions/${uid}_${requestId}`), from=db().doc(`users/${uid}`), to=db().doc(`users/${target}`);
  const [old,sender,recipient,config]=await Promise.all([tx.get(receipt),tx.get(from),tx.get(to),tx.get(db().doc('settings/appConfig'))]);
  if(old.exists) return {ok:true};
  const gift=config.data()?.gifts?.find(x=>x.id===giftId); if(!gift) throw new HttpsError('failed-precondition','Gift catalog not configured');
  const price=integer(gift.price);
  if(!sender.exists||!recipient.exists||(sender.data().coins||0)<price) throw new HttpsError('failed-precondition','Insufficient balance or missing user');
  const day=new Date().toISOString().slice(0,10);
  tx.set(db().doc(`giftRankings/${uid}_${day}`),{uid,name:sender.data().displayName||'Player',day,sent:FieldValue.increment(price)},{merge:true});
  tx.update(from,{coins:FieldValue.increment(-price)});
  tx.update(to,{coins:FieldValue.increment(Math.floor(price*.7)),[`receivedGifts.${giftId}`]:FieldValue.increment(1)});
  tx.create(receipt,{type:'gift',uid,target,giftId,amount:price,createdAt:FieldValue.serverTimestamp()}); return {ok:true};
 });
});
export const creditCoins = onCall(async r=>{
 const actor=admin(r),target=id(r.data.targetUid),amount=integer(r.data.amount),requestId=id(r.data.requestId);
 return db().runTransaction(async tx=>{
  const ref=db().doc(`transactions/${actor}_${requestId}`),user=db().doc(`users/${target}`);
  const [old,u]=await Promise.all([tx.get(ref),tx.get(user)]); if(old.exists)return {ok:true};
  if(!u.exists)throw new HttpsError('not-found','User not found');
  tx.update(user,{coins:FieldValue.increment(amount)}); tx.create(ref,{type:'admin_credit',actor,target,amount,createdAt:FieldValue.serverTimestamp()});return {ok:true};
 });
});
export const claimDaily = onCall(async r=>{
 const uid=uidOf(r),day=new Date().toISOString().slice(0,10);
 return db().runTransaction(async tx=>{
  const ref=db().doc(`dailyClaims/${uid}_${day}`),user=db().doc(`users/${uid}`);
  const [old,u]=await Promise.all([tx.get(ref),tx.get(user)]);
  if(old.exists)throw new HttpsError('already-exists','Already claimed today (UTC)');
  if(!u.exists)throw new HttpsError('not-found','User not found');
  tx.update(user,{coins:FieldValue.increment(100000)});tx.create(ref,{uid,day,createdAt:FieldValue.serverTimestamp()});return {ok:true};
 });
});
export const setAdmin = onCall(async r=>{
 const actor=admin(r); if(r.auth.token.superAdmin!==true)throw new HttpsError('permission-denied','Owner required');
 const uid=id(r.data.uid);if(uid===actor)throw new HttpsError('failed-precondition','Cannot revoke own role');
 const user=await getAuth().getUser(uid);
 await getAuth().setCustomUserClaims(uid,{...user.customClaims,admin:r.data.enabled===true});
 await db().collection('adminAudit').add({actor,target:uid,enabled:r.data.enabled===true,createdAt:FieldValue.serverTimestamp()});return {ok:true};
});

export const playRound = onCall(async r => {
 const uid=uidOf(r), requestId=id(r.data.requestId), game=r.data.game;
 const { settle } = await import('./game-logic.js');
 return db().runTransaction(async tx=>{
  const receipt=db().doc(`gameRounds/${uid}_${requestId}`),user=db().doc(`users/${uid}`),poolRef=db().doc('gameState/jackpot');
  const [old,u,pool]=await Promise.all([tx.get(receipt),tx.get(user),tx.get(poolRef)]);
  if(old.exists)return old.data().settlement;
  if(!u.exists)throw new HttpsError('not-found','Profile missing');
  let result;try{result=settle(game,r.data.bets,pool.data()?.amount??21817399);}catch{throw new HttpsError('invalid-argument','Invalid game or bet');}
  const data=u.data(),balance=data.coins||0;
  if(balance<result.cost)throw new HttpsError('failed-precondition','Insufficient balance');
  const day=new Date().toISOString().slice(0,10),todayWon=(data.winDay===day?data.todayWon||0:0)+result.win;
  const settlement={...result,balance:balance-result.cost+result.win};
  tx.update(user,{coins:settlement.balance,todayWon,winDay:day,totalWon:(data.totalWon||0)+result.win});
  if(game==='jackpot_fruit')tx.set(poolRef,{amount:result.pool});
  tx.create(receipt,{userId:uid,gameType:game,betAmount:result.cost,winAmount:result.win,result:result.results.join(','),createdAt:new Date().toISOString(),settlement});
  tx.set(db().doc(`gameRankings/${uid}`),{userId:uid,userName:data.displayName||'Player',userAvatar:data.avatarUrl||'',todayWon,day});
  return settlement;
 });
});

// Optional TURN REST credentials. Configure TURN_URL and TURN_SHARED_SECRET
// in the backend environment only; never bundle shared secrets in VITE_* variables.
export const getVoiceConfig = onCall(async r => {
 const uid=uidOf(r);
 const url=process.env.TURN_URL,secret=process.env.TURN_SHARED_SECRET;
 if(!url||!secret)return {iceServers:[]};
 const {createHmac}=await import('node:crypto');
 const username=`${Math.floor(Date.now()/1000)+3600}:${uid}`;
 return {iceServers:[{urls:url,username,credential:createHmac('sha1',secret).update(username).digest('base64')}]};
});
