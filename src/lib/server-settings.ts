import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

/**
 * Fetch the first (and only) Mall record.
 * If no mall exists, create a default one on the fly.
 */
export const getMallSettingsServer = createServerFn({ method: "GET" }).handler(async () => {
  try {
    let mall = await prisma.mall.findFirst();

    // Auto-seed if it doesn't exist yet
    if (!mall) {
      mall = await prisma.mall.create({
        data: {
          name: "GrandSquare Mall",
          location: "Pune, Maharashtra",
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
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
    try {
      const mall = await prisma.mall.update({
        where: { id: data.id },
        data: {
          name: data.name,
          location: data.location,
          currency: data.currency,
          timezone: data.timezone,
        },
      });
      return { success: true, mall };
    } catch (error) {
      console.error("Error updating mall settings:", error);
      throw new Error("Failed to update settings");
    }
  });
