import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";

/**
 * Fetch the first (and only) Mall record.
 * If no mall exists, create a default one on the fly.
 */
export const getMallSettingsServer = createServerFn({ method: "GET" }).handler(async () => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
  try {
    let mall = await prisma.workspace.findFirst();

    // Auto-seed if it doesn't exist yet
    if (!mall) {
      mall = // @ts-ignore
 await prisma.workspace.create({
        data: {
                  name: "GrandSquare Mall",
                  location: "Pune, Maharashtra",
                  currency: "INR",
                  timezone: "Asia/Kolkata",
                } as any,
      });
    }
    return mall;
  } catch (error) {
    console.error("Error fetching mall settings:", error);
    throw new Error("Failed to load settings");
  }
});

/**
 * Update the Mall settings.
 */
export const updateMallSettingsServer = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; name: string; location: string; currency: string; timezone: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    try {
      const mall = // @ts-ignore
 await prisma.workspace.update({
        where: { id: data.id } as any,
        data: {
                  name: data.name,
                  location: data.location,
                  currency: data.currency,
                  timezone: data.timezone,
                } as any,
      });
      return { success: true, mall };
    } catch (error) {
      console.error("Error updating mall settings:", error);
      throw new Error("Failed to update settings");
    }
  });
