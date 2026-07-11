import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export const getMessageLogsServer = createServerFn({ method: "GET" }).handler(async () => {
  return prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
  });
});
