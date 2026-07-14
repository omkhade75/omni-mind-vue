import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./server-auth";
import { tenantContext } from "./server/tenant-context";
import type { AIResponseContract } from "./tool-types";
export type { AIResponseContract };

export const askOmniMindServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      query: string;
      evidenceText: string;
      intent: string;
      resolvedDate: string;
      role?: string;
      email?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    // Dynamic import to isolate server-only module from Vite client analyzer
    const { askOmniMindServerImpl } = await import("./server-ai-impl");
    return await tenantContext.run(user.workspaceId, () => {
      return askOmniMindServerImpl(data);
    });
  });
