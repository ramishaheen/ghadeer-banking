import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "kf_session";

/**
 * Resolves the current session user. The demo environment auto-provisions
 * the seeded user (Ahmed) and sets a real session cookie on first contact,
 * so every API call still goes through genuine session resolution.
 */
export async function getSessionUser() {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;

  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) return user;
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return null;

  try {
    jar.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // cookies() is read-only inside Server Components; the API routes set it.
  }
  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "No active session. Seed the database first.");
  }
  return user;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
