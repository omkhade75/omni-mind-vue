import { AsyncLocalStorage } from "async_hooks";
import { getTenantPrisma as baseGetTenantPrisma } from "./prisma";

export const tenantContext = new AsyncLocalStorage<string>();

export function getTenantPrisma() {
  const workspaceId = tenantContext.getStore();
  if (!workspaceId) {
    throw new Error("No tenant context found. Are you calling getTenantPrisma outside of an AI request?");
  }
  return baseGetTenantPrisma(workspaceId);
}
