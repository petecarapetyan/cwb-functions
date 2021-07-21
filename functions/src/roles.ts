import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";

export const setUserRoles = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    console.log(`WOULDA ${change} AND ${context}`)
    // const userData = change.after.data();
    // if (userData && userData["roles"]) {
    //   const rolesObject = userData["roles"];
    //   const uid = context.auth?.uid;
    //   if (uid && rolesObject) {
    //     await admin.auth().setCustomUserClaims(uid, rolesObject);
    //   }
    // }
  });
