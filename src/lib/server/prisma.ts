import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

/**
 * Returns a Prisma client extension that automatically filters by workspaceId.
 * This ensures strict multi-tenancy isolation for all business models.
 */
export function getTenantPrisma(workspaceId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Models that are global/system-level and do NOT have workspaceId
          const globalModels = [
            "Workspace",
            "WorkspaceSettings",
            "PendingRegistration",
            "LoginHistory",
            "ApprovalLog"
          ];

          if (globalModels.includes(model)) {
            return query(args);
          }

          // Automatically inject workspaceId into where clause for read/update/delete
          const filterOperations = [
            "findUnique",
            "findUniqueOrThrow",
            "findFirst",
            "findFirstOrThrow",
            "findMany",
            "update",
            "updateMany",
            "delete",
            "deleteMany",
            "count",
            "aggregate",
            "groupBy"
          ];

          if (filterOperations.includes(operation)) {
            if (!args) args = {};
            if (!(args as any).where) (args as any).where = {};
            // Inject workspaceId filter
            (args as any).where.workspaceId = workspaceId;
          }

          // Automatically inject workspaceId into create operations
          const createOperations = ["create", "createMany"];
          if (createOperations.includes(operation)) {
            if (!args) args = {};
            if (!(args as any).data) (args as any).data = {};

            if (Array.isArray((args as any).data)) {
              (args as any).data = (args as any).data.map((d: any) => ({ ...d, workspaceId }));
            } else {
              (args as any).data.workspaceId = workspaceId;
            }
          }

          // For upsert, we need to inject it into where, update, and create
          if (operation === "upsert") {
            if (!args) args = {};
            if (!(args as any).where) (args as any).where = {};
            if (!(args as any).create) (args as any).create = {};
            if (!(args as any).update) (args as any).update = {};

            (args as any).where.workspaceId = workspaceId;
            (args as any).create.workspaceId = workspaceId;
            // update usually doesn't need it injected into the payload since it's just updating, but we can do it for safety
          }

          return query(args);
        },
      },
    },
  });
}
