import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { getSecureSessionUser } from "./server-auth";

export const getMessageLogsServer = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSecureSessionUser();
  if (!user) throw new Error("Unauthorized");
  const prisma = getTenantPrisma(user.workspaceId);

  return prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
  });
});
