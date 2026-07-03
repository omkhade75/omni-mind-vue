import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentSessionServer, loginServer, logoutServer, demoLoginServer, type AuthUser } from "./server-auth";

export type Role = "owner" | "admin" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  demoLogin: async () => {},
  logout: async () => {},
});

function mapDbRoleToLocal(dbRole: string): Role {
  const lower = dbRole.toLowerCase();
  if (lower === "owner") return "owner";
  if (lower === "admin") return "admin";
  if (lower === "manager") return "manager";
  return "owner";
}

function mapAuthUserToUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: mapDbRoleToLocal(authUser.role),
    departmentId: authUser.departmentId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check server session (not localStorage!)
  useEffect(() => {
    getCurrentSessionServer()
      .then((res) => {
        if (res.user) {
          setUser(mapAuthUserToUser(res.user));
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginServer({ data: { email, password } });
    if (res.success && res.user) {
      setUser(mapAuthUserToUser(res.user));
    }
  };

  const demoLogin = async (role: Role) => {
    const res = await demoLoginServer({ data: { role } });
    if (res.success && res.user) {
      setUser(mapAuthUserToUser(res.user));
    }
  };

  const logout = async () => {
    await logoutServer();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, demoLogin, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
