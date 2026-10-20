/** Operazione manuale di recupero: node settleEliteWeek.mjs settimana_YYYY_N */
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {settleVerifiedEliteWeek} from './eliteSettlementService.mjs';
const weekKey=process.argv[2];
if(!weekKey)throw Error('Indicare la settimana da liquidare');
if(!process.env.FIREBASE_DATABASE_URL||!process.env.GOOGLE_APPLICATION_CREDENTIALS)
  throw Error('Firebase Admin e Database URL obbligatori');
if(!getApps().length)initializeApp({credential:applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});
console.log(await settleVerifiedEliteWeek(getDatabase(),weekKey));
