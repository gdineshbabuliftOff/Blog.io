// lib/firebaseAdmin.ts

import admin from "firebase-admin";

// Read env vars safely
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase environment variables.");
}

// Initialize only if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Firebase admin initialization error:", error.stack);
    } else {
      console.error("Firebase admin initialization error:", error);
    }
  }
}

export const dbAdmin = admin.firestore();
export const authAdmin = admin.auth();
