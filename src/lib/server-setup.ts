import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getSecureSessionUser } from "./server-auth";
import { Prisma } from "@prisma/client";

export const completeWorkspaceSetupServer = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const user = await getSecureSessionUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.$transaction(async (tx) => {
      // Update workspace properties
      await tx.workspace.update({
        where: { id: user.workspaceId },
        data: {
          name: data.businessName,
          currency: data.currency,
          timezone: data.timezone,
          setupCompleted: true,
        },
      });

      // Create first department
      await tx.department.create({
        data: {
          name: data.firstDepartmentName,
          code: data.firstDepartmentName.substring(0, 4).toUpperCase(),
          floor: "Ground",
          targetRevenue: new Prisma.Decimal(100000),
          status: "Active",
          workspaceId: user.workspaceId,
        },
      });

      // Update workspace settings with tax rate
      await tx.workspaceSettings.upsert({
        where: { workspaceId: user.workspaceId },
        create: {
          workspaceId: user.workspaceId,
          features: JSON.stringify({ defaultTaxRate: data.taxRate }),
        },
        update: {
          features: JSON.stringify({ defaultTaxRate: data.taxRate }),
        }
      });

      // Note: Sample data generation skipped for brevity/safety unless explicitly required.
    });

    return { success: true };
  });
