"use client";

import { createSession as serverCreateSession, clearSession as serverClearSession } from "./cookies";

export async function createSessionClient(idToken: string) {
  // Save in localStorage
  localStorage.setItem("blogToken", idToken);

  // Call server action to set cookie
  await serverCreateSession(idToken);
}

export async function clearSessionClient() {
  // Remove from localStorage
  localStorage.removeItem("blogToken");

  // Clear cookie
  await serverClearSession();
}
