/** Admin only: proiezione leggibile della classifica Élite verificata, senza segreti. */
import {publicElitePlayersFromVerified} from '../src/eliteServices.js';

export async function publishVerifiedEliteLeaderboard(db, weekKey) {
  const results = (await db.ref(`eliteVerifiedWeeks/${weekKey}/results`).get()).val() || {};
  const profiles = {};
  await Promise.all(Object.keys(results).map(async uid=>{
    const snap = await db.ref(`serverProfiles/${uid}/nickname`).get();
    profiles[uid] = {nickname:snap.val()};
  }));
  const players = publicElitePlayersFromVerified(results,profiles,weekKey);
  await db.ref(`elitePublicWeeks/${weekKey}`).set({weekKey, players, updatedAt:Date.now(),source:'verified-online-poker'});
  return Object.keys(players).length;
}
