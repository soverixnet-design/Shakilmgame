import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebase';
export async function callServer(name: string, data: unknown) {
 if (!auth.currentUser) throw new Error('Sign in required');
 const fn = httpsCallable(getFunctions(auth.app, 'us-central1'), name);
 return (await fn(data)).data;
}
