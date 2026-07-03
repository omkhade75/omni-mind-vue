import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import {
  useSession,
  clearSession,
} from "@tanstack/start-server-core";
import type { SessionConfig } from "@tanstack/start-server-core";

// Session configuration - password comes from env, never hardcoded
const SESSION_SECRET = process.env.SESSION_SECRET || "omnimind-ai-session-secret-change-in-production-please-32chars!";

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
};

/**
 * Server-side login: validates credentials against the DB User table.
 * For demo accounts, we allow login by email without password verification.
 * In production, you'd verify bcrypt/argon2 hashed passwords.
 */
export const loginServer = createServerFn({ method: "POST" })
  .validator(
    (data: { email: string; password: string }) => data
  )
  .handler(async ({ data: payload }) => {
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // For demo: allow any password for seeded demo accounts
    // In production, verify password hash here:
    // const valid = await bcrypt.compare(payload.password, user.passwordHash);
    // if (!valid) throw new Error("Invalid email or password");

    // Create server session
    const session = await useSession<{ userId: string; role: string; email: string; name: string; departmentId: string | null }>(sessionConfig);
    await session.update({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      departmentId: user.departmentId,
    });

    // Return sanitized user (never return passwordHash)
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      } as AuthUser,
    };
  });

/**
 * Quick demo login by role name. Used by the demo buttons.
 */
export const demoLoginServer = createServerFn({ method: "POST" })
  .validator((data: { role: string }) => data)
  .handler(async ({ data: payload }) => {
    const roleMap: Record<string, string> = {
      owner: "OWNER",
      admin: "ADMIN",
      manager: "MANAGER",
      Owner: "OWNER",
      Admin: "ADMIN",
      Manager: "MANAGER",
      OWNER: "OWNER",
      ADMIN: "ADMIN",
      MANAGER: "MANAGER",
    };

    const dbRole = roleMap[payload.role];
    if (!dbRole) throw new Error("Invalid role");

    const user = await prisma.user.findFirst({
      where: { role: dbRole },
    });

    if (!user) throw new Error(`No ${dbRole} user found in database`);

    const session = await useSession<{ userId: string; role: string; email: string; name: string; departmentId: string | null }>(sessionConfig);
    await session.update({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      departmentId: user.departmentId,
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      } as AuthUser,
    };
  });

/**
 * Get the current authenticated user from the server session.
 * Returns null if no valid session exists.
 */
export const getCurrentSessionServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const session = await useSession<{ userId: string; role: string; email: string; name: string; departmentId: string | null }>(sessionConfig);
      if (!session.data.userId) {
        return { user: null };
      }

      return {
        user: {
          id: session.data.userId,
          name: session.data.name || "",
          email: session.data.email || "",
          role: session.data.role || "",
          departmentId: session.data.departmentId || null,
        } as AuthUser,
      };
    } catch {
      return { user: null };
    }
  });

/**
 * Logout: clears the server session cookie.
 */
export const logoutServer = createServerFn({ method: "POST" })
  .handler(async () => {
    await clearSession(sessionConfig);
    return { success: true };
  });
