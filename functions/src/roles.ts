import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const setUserRoles = functions.firestore
.document('users/{userId}/roles')
.onWrite(async (change, context) => {
  const uid = context.auth?.uid;
  const claims = change;
  if(uid){
    await admin.auth().setCustomUserClaims(uid, claims);
  }
  return
});