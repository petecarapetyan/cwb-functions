import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const registerNewUser = functions.auth
  .user()
  .onCreate(async (user) => {
    const db = await admin.firestore();
    const claims = {
      user: true
    };
    const roles = {
      roles: JSON.stringify(claims)
    }
    await db.collection("users").doc(`${user.uid}`).set(roles);
    // const uid = user.uid;
    // return admin.auth().setCustomUserClaims(uid, claims);
  });
