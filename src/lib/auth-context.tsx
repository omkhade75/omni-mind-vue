import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentSessionServer, loginServer, logoutServer, type AuthUser } from "./server-auth";
import type { ReactNode } from "react";

export type Role = "owner" | "admin" | "manager" | "staff" | "security";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  workspaceId: string;
  isSystemAdmin: boolean;
  isImpersonating?: boolean;
  originalAdminId?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => undefined,
  logout: async () => {},
});

function mapDbRoleToLocal(dbRole: string): Role {
  const r = dbRole.toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  if (r === "manager") return "manager";
  if (r === "security") return "security";
  return "staff";
}

function mapAuthUserToUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: mapDbRoleToLocal(authUser.role),
    departmentId: authUser.departmentId,
    workspaceId: authUser.workspaceId,
    isSystemAdmin: authUser.isSystemAdmin,
    isImpersonating: authUser.isImpersonating,
    originalAdminId: authUser.originalAdminId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentSessionServer().then((res) => {
      if (res.user) {
        setUser(mapAuthUserToUser(res.user));
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginServer({ data: { email, password } });
    if (res.success && res.user) {
      const mapped = mapAuthUserToUser(res.user);
      setUser(mapped);
      return mapped;
    }
  };

  const logout = async () => {
    await logoutServer();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
