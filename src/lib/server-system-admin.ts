import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getSecureSessionUser } from "./server-auth";
import { sendSystemEmail } from "./server-email";

// Middleware to ensure only SYSTEM_ADMIN can run these functions
async function requireSystemAdmin() {
  const sessionUser = await getSecureSessionUser();
  if (!sessionUser || !sessionUser.isSystemAdmin) {
    throw new Error("Unauthorized. System Admin access required.");
  }
  return sessionUser;
}

export const getSystemAdminDashboardServer = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSystemAdmin();

    const pending = await prisma.pendingRegistration.findMany({
      where: { status: "Pending" },
      orderBy: { createdAt: "desc" },
    });

    const approved = await prisma.pendingRegistration.findMany({
      where: { status: "Approved" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const rejected = await prisma.pendingRegistration.findMany({
      where: { status: "Rejected" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const workspaceCount = await prisma.workspace.count();
    const userCount = await prisma.user.count();

    return {
      pending,
      approved,
      rejected,
      stats: {
        totalWorkspaces: workspaceCount,
        totalUsers: userCount,
      },
    };
  }
);

export const approveRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: data.id },
    });

    if (!registration) throw new Error("Registration not found");
    if (registration.status !== "Pending") throw new Error("Registration is not pending");

    // Execute in a transaction to ensure atomic workspace creation
    await prisma.$transaction(async (tx) => {
      // 1. Create Workspace
      const workspace = await tx.workspace.create({
        data: {
          name: registration.companyName,
          industry: registration.industry,
          businessType: registration.businessType,
          timezone: registration.timezone,
          currency: registration.currency,
          status: "Active",
          setupCompleted: false, // Must go through setup wizard
        },
      });

      // 2. Create Workspace Settings
      await tx.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
          branding: JSON.stringify({ primaryColor: "#4f46e5" }),
          features: JSON.stringify(["core", "ai", "reports"]),
        },
      });

      // 3. Create Owner User
      await tx.user.create({
        data: {
          name: registration.ownerName,
          email: registration.ownerEmail,
          passwordHash: registration.passwordHash,
          role: "OWNER",
          workspaceId: workspace.id,
          isSystemAdmin: false,
          status: "Active",
        },
      });

      // 4. Update Registration Status
      await tx.pendingRegistration.update({
        where: { id: registration.id },
        data: { status: "Approved" },
      });

      // 5. Create Approval Log
      await tx.approvalLog.create({
        data: {
          adminId: admin.id,
          registrationId: registration.id,
          action: "Approve",
          notes: "Automatically provisioned workspace and owner account.",
        },
      });
    });

    // 6. Send Approval Email
    try {
      await sendSystemEmail({
        to: registration.ownerEmail,
        subject: `Welcome to OmniMind AI: ${registration.companyName} Approved!`,
        body: `
Dear ${registration.ownerName},

Your registration for ${registration.companyName} has been approved!
Your dedicated workspace has been provisioned successfully.

You can now log in at: https://omni-mind-vue-main.vercel.app/login (or your production URL)
Using your email: ${registration.ownerEmail}

Upon your first login, you will be guided through a quick business setup wizard.

Welcome aboard!
- OmniMind AI System Administrator
        `,
      });
    } catch (e) {
      console.error("Failed to send approval email", e);
    }

    return { success: true };
  });

export const rejectRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: data.id },
    });

    if (!registration) throw new Error("Registration not found");

    await prisma.pendingRegistration.update({
      where: { id: data.id },
      data: { status: "Rejected" },
    });

    await prisma.approvalLog.create({
      data: {
        adminId: admin.id,
        registrationId: registration.id,
        action: "Reject",
        notes: data.reason || "No reason provided",
      },
    });

    try {
      await sendSystemEmail({
        to: registration.ownerEmail,
        subject: `Registration Update: ${registration.companyName}`,
        body: `
Dear ${registration.ownerName},

Unfortunately, your registration for OmniMind AI has been declined at this time.
Reason: ${data.reason || "Internal administrative decision."}

If you believe this was in error, please reply to this email.
        `,
      });
    } catch (e) {
      console.error("Failed to send rejection email", e);
    }

    return { success: true };
  });
