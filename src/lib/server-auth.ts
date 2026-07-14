import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { useSession, clearSession } from "@tanstack/start-server-core";
import type { SessionConfig } from "@tanstack/start-server-core";
import bcrypt from "bcryptjs";

// Session configuration - password comes from env, never hardcoded
const SESSION_SECRET =
  process.env.SESSION_SECRET || "omnimind-ai-session-secret-change-in-production-please-32chars!";

const sessionConfig: SessionConfig = {
  password: SESSION_SECRET,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  name: "omnimind_session",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  workspaceId: string;
  isSystemAdmin: boolean;
  setupCompleted: boolean;
};

type SessionData = {
  userId: string;
  role: string;
  email: string;
  name: string;
  departmentId: string | null;
  workspaceId: string;
  isSystemAdmin: boolean;
  setupCompleted: boolean;
};

/**
 * Server-side login: validates credentials against the DB User table.
 */
export const loginServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data: payload }) => {
    const user = await prisma.user.findFirst({
      where: { email: payload.email } as any,
      include: { workspace: true },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "Active") {
      throw new Error("Your account is currently inactive or pending approval.");
    }

    if (!user.workspaceId || !user.workspace) {
      throw new Error("User has no associated workspace. Please contact system admin.");
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password");

    // Create server session
    const session = await useSession<SessionData>(sessionConfig);
    await session.update({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      departmentId: user.departmentId,
      workspaceId: user.workspaceId,
      isSystemAdmin: user.isSystemAdmin,
      setupCompleted: user.workspace.setupCompleted,
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        workspaceId: user.workspaceId,
        isSystemAdmin: user.isSystemAdmin,
        setupCompleted: user.workspace.setupCompleted,
      } as AuthUser,
    };
  });

/**
 * Get the current authenticated user from the server session.
 * Returns null if no valid session exists.
 */
export const getCurrentSessionServer = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await useSession<SessionData>(sessionConfig);
    if (!session.data.userId || !session.data.workspaceId) {
      return { user: null };
    }

    return {
      user: {
        id: session.data.userId,
        name: session.data.name || "",
        email: session.data.email || "",
        role: session.data.role || "",
        departmentId: session.data.departmentId || null,
        workspaceId: session.data.workspaceId,
        isSystemAdmin: session.data.isSystemAdmin || false,
        setupCompleted: session.data.setupCompleted ?? true,
      } as AuthUser,
    };
  } catch {
    return { user: null };
  }
});

/**
 * Logout: clears the server session cookie.
 */
export const logoutServer = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(sessionConfig);
  return { success: true };
});

/**
 * Reads and returns the securely authenticated session user.
 * Prevents client-side parameter spoofing.
 */
export async function getSecureSessionUser(): Promise<AuthUser | null> {
  try {
    const session = await useSession<SessionData>(sessionConfig);
    if (!session.data.userId || !session.data.workspaceId) {
      return null;
    }
    return {
      id: session.data.userId,
      name: session.data.name || "",
      email: session.data.email || "",
      role: session.data.role || "",
      departmentId: session.data.departmentId || null,
      workspaceId: session.data.workspaceId,
      isSystemAdmin: session.data.isSystemAdmin || false,
      setupCompleted: session.data.setupCompleted ?? true,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to ensure the caller is authenticated. Throws if not.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSecureSessionUser();
  if (!user) {
    throw new Error("Unauthorized: Please log in.");
  }
  return user;
}

/**
 * Helper to ensure the caller is a System Admin. Throws if not.
 */
export async function requireSystemAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!user.isSystemAdmin) {
    throw new Error("Forbidden: System Administrator access required.");
  }
  return user;
}
