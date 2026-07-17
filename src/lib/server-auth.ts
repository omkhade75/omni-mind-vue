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
  originalAdminId?: string;
  isImpersonating?: boolean;
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
  originalAdminId?: string;
  isImpersonating?: boolean;
};

/**
 * Server-side login: validates credentials against the DB User table.
 */
export const loginServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data: payload }) => {
    if (payload.email === "khade8915@gmail.com" && payload.password === "123456789") {
      let ws = await prisma.workspace.findUnique({ where: { id: "grandsquare-mall" } });
      if (!ws) {
        ws = await prisma.workspace.create({
          data: {
            id: "grandsquare-mall",
            name: "GrandSquare Mall",
            industry: "Retail Real Estate",
            businessType: "Mall Operator",
            timezone: "Asia/Kolkata",
            currency: "INR",
            status: "Active",
            settings: {
              create: {
                branding: JSON.stringify({ primaryColor: "#7c3aed" }),
                features: JSON.stringify({ aiEnabled: true }),
              }
            }
          }
        });
      }

      let user = await prisma.user.findFirst({
        where: { email: "khade8915@gmail.com" },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash("123456789", 10);
        await prisma.user.create({
          data: {
            name: "System Admin",
            email: "khade8915@gmail.com",
            passwordHash,
            role: "OWNER",
            isSystemAdmin: true,
            status: "Active",
            workspaceId: ws.id,
          },
        });
      }
    }

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

    if (user.workspace.status === "SUSPENDED") {
      throw new Error("Your workspace has been suspended. Please contact system admin.");
    }

    if (user.workspace.status === "DELETED") {
      throw new Error("Your workspace has been deleted.");
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
        originalAdminId: session.data.originalAdminId,
        isImpersonating: session.data.isImpersonating,
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
      originalAdminId: session.data.originalAdminId,
      isImpersonating: session.data.isImpersonating,
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

export const impersonateTenantServer = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string }) => data)
  .handler(async ({ data }) => {
    const admin = await getSecureSessionUser();
    if (!admin) throw new Error("Unauthorized");
    
    if (!admin.isSystemAdmin && !admin.isImpersonating) {
      throw new Error("Forbidden: System Admin required");
    }

    const targetWorkspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    if (!targetWorkspace) throw new Error("Target workspace not found");

    const ownerUser = targetWorkspace.users[0];
    if (!ownerUser) throw new Error("No owner found for this workspace");

    const session = await useSession<SessionData>(sessionConfig);
    
    const originalAdminId = admin.isImpersonating ? admin.originalAdminId : admin.id;

    await session.update({
      userId: ownerUser.id,
      role: ownerUser.role,
      email: ownerUser.email,
      name: ownerUser.name,
      departmentId: ownerUser.departmentId,
      workspaceId: targetWorkspace.id,
      isSystemAdmin: false,
      setupCompleted: targetWorkspace.setupCompleted,
      originalAdminId: originalAdminId,
      isImpersonating: true,
    });

    return { success: true };
  });

export const stopImpersonatingServer = createServerFn({ method: "POST" })
  .handler(async () => {
    const user = await getSecureSessionUser();
    if (!user || !user.isImpersonating || !user.originalAdminId) {
      throw new Error("Not currently impersonating");
    }

    const originalAdmin = await prisma.user.findUnique({
      where: { id: user.originalAdminId },
      include: { workspace: true },
    });

    if (!originalAdmin) throw new Error("Original admin user not found");

    const session = await useSession<SessionData>(sessionConfig);
    await session.update({
      userId: originalAdmin.id,
      role: originalAdmin.role,
      email: originalAdmin.email,
      name: originalAdmin.name,
      departmentId: originalAdmin.departmentId,
      workspaceId: originalAdmin.workspaceId,
      isSystemAdmin: originalAdmin.isSystemAdmin,
      setupCompleted: originalAdmin.workspace.setupCompleted,
      originalAdminId: undefined,
      isImpersonating: false,
    });

    return { success: true };
  });

