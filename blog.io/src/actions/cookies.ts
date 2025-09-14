"use server";

import { cookies } from "next/headers";

export async function createSession(idToken: string) {
  cookies().set("blogToken", idToken, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });
}

export async function clearSession() {
  cookies().set("blogToken", "", {
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<string | null> {
  return cookies().get("blogToken")?.value || null;
}
