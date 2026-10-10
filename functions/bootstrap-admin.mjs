// Run in an authenticated administrative environment using Application Default Credentials.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const uid=process.argv[2];if(!uid)throw new Error('Usage: node scripts/bootstrap-admin.mjs FIREBASE_UID');
initializeApp({credential:applicationDefault()});
const user=await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid,{...user.customClaims,admin:true,superAdmin:true});
console.log('Owner role assigned. Sign out and sign back in.');
