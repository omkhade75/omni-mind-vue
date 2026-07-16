import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getSecureSessionUser } from "./server-auth";
import { sendSystemEmail, EmailTemplates } from "./server-email";
import bcrypt from "bcryptjs";
import { getRequest } from "@tanstack/react-start/server";
import { Prisma } from "@prisma/client";

// Middleware to ensure only SYSTEM_ADMIN can run these functions
async function requireSystemAdmin() {
  const sessionUser = await getSecureSessionUser();
  if (!sessionUser || !sessionUser.isSystemAdmin) {
    throw new Error("Unauthorized. System Admin access required.");
  }
  return sessionUser;
}

// 1. System Admin Dashboard Metrics
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

    const suspended = await prisma.pendingRegistration.findMany({
      where: { status: "Suspended" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    // Counts
    const totalCompanies = await prisma.workspace.count();
    const activeCompanies = await prisma.workspace.count({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
    });
    const suspendedCompanies = await prisma.workspace.count({
      where: { status: "SUSPENDED" },
    });

    // Monthly / Today Registrations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const monthlyRegistrations = await prisma.pendingRegistration.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const todayRegistrations = await prisma.pendingRegistration.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const userCount = await prisma.user.count();
    
    // Online users mock (login histories in last 15 mins)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const onlineUsers = await prisma.loginHistory.count({
      where: { timestamp: { gte: fifteenMinsAgo }, status: "Success" },
    });

    // AI usage metrics (count of recommendation log/records)
    const aiUsage = await prisma.recommendation.count() + await prisma.anomaly.count();

    // Storage Usage estimate in bytes (row count estimate)
    const totalProducts = await prisma.product.count();
    const totalTransactions = await prisma.transaction.count();
    const totalMovements = await prisma.inventoryMovement.count();
    const totalCustomers = await prisma.customer.count();
    const rowBytesEstimate = (totalProducts + totalTransactions + totalMovements + totalCustomers) * 1024; // 1KB per row estimate

    return {
      pending,
      approved,
      rejected,
      suspended,
      stats: {
        totalCompanies,
        activeCompanies,
        pendingCount: pending.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        suspendedCount: suspendedCompanies,
        monthlyRegistrations,
        todayRegistrations,
        onlineUsers: onlineUsers || 1, // Fallback to 1 (admin themselves)
        aiUsage,
        storageUsage: rowBytesEstimate || 1024 * 100, // min 100KB
        totalUsers: userCount,
      },
    };
  }
);

// 2. Approve Registration Endpoint (Single Transaction)
export const approveRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: data.id },
    });

    if (!registration) throw new Error("Registration not found");
    if (registration.status !== "Pending") throw new Error("Registration is not pending");

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    let workspaceId = "";

    await prisma.$transaction(async (tx) => {
      // 1. Create Workspace
      const workspace = await tx.workspace.create({
        data: {
          name: registration.companyName,
          industry: registration.industry,
          businessType: registration.businessType,
          timezone: registration.timezone,
          currency: registration.currency,
          status: "ACTIVE", // Active company
          setupCompleted: false, // Must go through setup wizard
          plan: "TRIAL",
          subscriptionStatus: "TRIAL",
          trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
        },
      });

      workspaceId = workspace.id;

      // 2. Create Settings
      await tx.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
          branding: JSON.stringify({ primaryColor: "#4f46e5" }),
          features: JSON.stringify(["core", "ai", "reports"]),
        },
      });

      // 3. Create Notification Settings
      await tx.notificationSettings.create({
        data: {
          workspaceId: workspace.id,
          emailAlerts: true,
          smsAlerts: false,
        },
      });

      // 4. Create Security Settings
      await tx.securitySettings.create({
        data: {
          workspaceId: workspace.id,
          twoFactorAuth: false,
          ipWhitelist: null,
        },
      });

      // 5. Create Dashboard Preferences
      await tx.dashboardPreferences.create({
        data: {
          workspaceId: workspace.id,
          theme: "dark",
          layout: null,
        },
      });

      // 6. Create AI Configuration
      await tx.aIConfiguration.create({
        data: {
          workspaceId: workspace.id,
          modelName: "gemini-1.5-pro",
          temperature: 0.7,
        },
      });

      // 7. Create Owner User (Password already hashed when registration created)
      const owner = await tx.user.create({
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

      // 8. Create Workspace Member relation
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: owner.id,
          role: "OWNER",
        },
      });

      // 9. Update PendingRegistration status
      await tx.pendingRegistration.update({
        where: { id: registration.id },
        data: { status: "Approved" },
      });

      // 10. Record expanded ApprovalAudit
      await tx.approvalAudit.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          tenantName: registration.ownerName,
          workspaceId: workspace.id,
          userAgent: userAgent,
          ipAddress: ipAddress,
          actionType: "APPROVE",
          registrationId: registration.id,
        },
      });
    });

    // Send Welcome Email outside of the transactional block
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      await sendSystemEmail({
        to: registration.ownerEmail,
        subject: `Welcome to OmniMind AI: ${registration.companyName} Approved!`,
        body: EmailTemplates.ApprovalEmail({
          companyName: registration.companyName,
          ownerEmail: registration.ownerEmail,
          workspaceName: registration.companyName,
          loginUrl: `${appUrl}/login`,
        }),
      });
    } catch (e) {
      console.error("Failed to send approval email", e);
    }

    return { success: true, workspaceId };
  });

// 3. Reject Registration Endpoint
export const rejectRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: data.id },
    });

    if (!registration) throw new Error("Registration not found");

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    await prisma.$transaction(async (tx) => {
      await tx.pendingRegistration.update({
        where: { id: data.id },
        data: { status: "Rejected" },
      });

      // Create Audit Log
      await tx.approvalAudit.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          tenantName: registration.ownerName,
          workspaceId: "N/A",
          userAgent: userAgent,
          ipAddress: ipAddress,
          actionType: "REJECT",
          registrationId: registration.id,
        },
      });
    });

    // Send Rejection Email
    try {
      const contactEmail = process.env.SYSTEM_ADMIN_EMAIL || "support@omnimind.ai";
      await sendSystemEmail({
        to: registration.ownerEmail,
        subject: `Update on your OmniMind AI Registration`,
        body: EmailTemplates.RejectionEmail({
          companyName: registration.companyName,
          reason: data.reason,
          contactEmail: contactEmail,
        }),
      });
    } catch (e) {
      console.error("Failed to send rejection email", e);
    }

    return { success: true };
  });

// 4. Suspend Registration Endpoint
export const suspendRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: data.id },
    });

    if (!registration) throw new Error("Registration not found");

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    await prisma.$transaction(async (tx) => {
      await tx.pendingRegistration.update({
        where: { id: data.id },
        data: { status: "Suspended" },
      });

      await tx.approvalAudit.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          tenantName: registration.ownerName,
          workspaceId: "N/A",
          userAgent: userAgent,
          ipAddress: ipAddress,
          actionType: "SUSPEND",
          registrationId: registration.id,
        },
      });
    });

    return { success: true };
  });

// 5. Delete Registration Request
export const deleteRegistrationServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();
    await prisma.pendingRegistration.delete({
      where: { id: data.id },
    });
    return { success: true };
  });

// 6. Search Workspaces / Companies
export const searchCompaniesServer = createServerFn({ method: "GET" })
  .validator((data: { query?: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();

    const queryStr = data.query || "";

    const workspaces = await prisma.workspace.findMany({
      where: {
        AND: [
          { name: { contains: queryStr, mode: "insensitive" } },
          { status: { not: "DELETED" } }, // Exclude soft-deleted
        ],
      },
      include: {
        users: {
          where: { role: "OWNER" },
          take: 1,
        },
        _count: {
          select: {
            products: true,
            customers: true,
            transactions: true,
            users: true,
            suppliers: true,
            departments: true,
            expenses: true,
            recommendations: true,
            anomalies: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return { workspaces };
  });

// 7. Suspend Workspace (Prevents Tenant Login)
export const suspendWorkspaceServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const workspace = await prisma.workspace.update({
      where: { id: data.id },
      data: { status: "SUSPENDED" },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    const ownerName = workspace.users[0]?.name || "N/A";

    await prisma.approvalAudit.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        tenantName: ownerName,
        workspaceId: workspace.id,
        userAgent: userAgent,
        ipAddress: ipAddress,
        actionType: "SUSPEND_WORKSPACE",
      },
    });

    return { success: true };
  });

// 8. Reactivate Workspace
export const reactivateWorkspaceServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const workspace = await prisma.workspace.update({
      where: { id: data.id },
      data: { status: "ACTIVE" },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    const ownerName = workspace.users[0]?.name || "N/A";

    await prisma.approvalAudit.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        tenantName: ownerName,
        workspaceId: workspace.id,
        userAgent: userAgent,
        ipAddress: ipAddress,
        actionType: "REACTIVATE_WORKSPACE",
      },
    });

    return { success: true };
  });

// 9. Soft Delete Workspace (Set status = DELETED)
export const deleteWorkspaceServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireSystemAdmin();

    const req = getRequest();
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const workspace = await prisma.workspace.update({
      where: { id: data.id },
      data: { status: "DELETED" },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    const ownerName = workspace.users[0]?.name || "N/A";

    await prisma.approvalAudit.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        tenantName: ownerName,
        workspaceId: workspace.id,
        userAgent: userAgent,
        ipAddress: ipAddress,
        actionType: "DELETE_WORKSPACE",
      },
    });

    return { success: true };
  });

// 10. Reset Owner Password
export const resetOwnerPasswordServer = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string; password?: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();

    const newPass = data.password || "Temp123456";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPass, salt);

    const ownerUser = await prisma.user.findFirst({
      where: { workspaceId: data.workspaceId, role: "OWNER" },
    });

    if (!ownerUser) throw new Error("No owner found for this workspace");

    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { passwordHash },
    });

    return { success: true, tempPassword: newPass };
  });

// 11. Resend Welcome Email
export const resendWelcomeEmailServer = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();

    const workspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    if (!workspace) throw new Error("Workspace not found");
    const owner = workspace.users[0];
    if (!owner) throw new Error("No owner found");

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await sendSystemEmail({
      to: owner.email,
      subject: `Welcome to OmniMind AI: ${workspace.name} (Resent)`,
      body: EmailTemplates.ApprovalEmail({
        companyName: workspace.name,
        ownerEmail: owner.email,
        workspaceName: workspace.name,
        loginUrl: `${appUrl}/login`,
      }),
    });

    return { success: true };
  });

// 12. View Audit Logs
export const getAuditLogsServer = createServerFn({ method: "GET" }).handler(async () => {
  await requireSystemAdmin();

  const audits = await prisma.approvalAudit.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return { audits };
});

// 13. Export Workspace (Backup JSON)
export const exportWorkspaceServer = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();

    const workspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: {
        settings: true,
        notificationSettings: true,
        securitySettings: true,
        dashboardPreferences: true,
        aiConfiguration: true,
        users: true,
        departments: true,
        products: true,
        customers: true,
        transactions: true,
        suppliers: true,
      },
    });

    if (!workspace) throw new Error("Workspace not found");

    return { workspaceData: JSON.stringify(workspace, null, 2) };
  });

// 14. Import Workspace (Restore JSON)
export const importWorkspaceServer = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string; importData: string }) => data)
  .handler(async ({ data }) => {
    await requireSystemAdmin();

    const imported = JSON.parse(data.importData);

    await prisma.$transaction(async (tx) => {
      // Clear existing settings/configurations safely
      await tx.workspaceSettings.deleteMany({ where: { workspaceId: data.workspaceId } });
      await tx.notificationSettings.deleteMany({ where: { workspaceId: data.workspaceId } });
      await tx.securitySettings.deleteMany({ where: { workspaceId: data.workspaceId } });
      await tx.dashboardPreferences.deleteMany({ where: { workspaceId: data.workspaceId } });
      await tx.aIConfiguration.deleteMany({ where: { workspaceId: data.workspaceId } });

      // Upsert preferences
      if (imported.settings) {
        await tx.workspaceSettings.create({
          data: {
            workspaceId: data.workspaceId,
            branding: imported.settings.branding,
            features: imported.settings.features,
          },
        });
      }

      if (imported.notificationSettings) {
        await tx.notificationSettings.create({
          data: {
            workspaceId: data.workspaceId,
            emailAlerts: imported.notificationSettings.emailAlerts,
            smsAlerts: imported.notificationSettings.smsAlerts,
          },
        });
      }

      if (imported.securitySettings) {
        await tx.securitySettings.create({
          data: {
            workspaceId: data.workspaceId,
            twoFactorAuth: imported.securitySettings.twoFactorAuth,
            ipWhitelist: imported.securitySettings.ipWhitelist,
          },
        });
      }

      if (imported.dashboardPreferences) {
        await tx.dashboardPreferences.create({
          data: {
            workspaceId: data.workspaceId,
            theme: imported.dashboardPreferences.theme,
            layout: imported.dashboardPreferences.layout,
          },
        });
      }

      if (imported.aiConfiguration) {
        await tx.aIConfiguration.create({
          data: {
            workspaceId: data.workspaceId,
            modelName: imported.aiConfiguration.modelName,
            temperature: imported.aiConfiguration.temperature,
          },
        });
      }

      // We can restore departments, products, etc. as needed for deep restore.
      // Simply logging import completion.
    });

    return { success: true };
  });
