import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "owner" | "admin" | "manager";

export interface User {
  name: string;
  email: string;
  role: Role;
}

const ROLE_USERS: Record<Role, User> = {
  owner: { name: "Aarav Mehra", email: "owner@grandsquare.in", role: "owner" },
  admin: { name: "Priya Nair", email: "admin@grandsquare.in", role: "admin" },
  manager: { name: "Rohan Kulkarni", email: "manager@grandsquare.in", role: "manager" },
};

interface AuthCtx {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("omnimind_role") as Role | null;
    if (stored && ROLE_USERS[stored]) setUser(ROLE_USERS[stored]);
  }, []);

  const login = (role: Role) => {
    setUser(ROLE_USERS[role]);
    if (typeof window !== "undefined") window.localStorage.setItem("omnimind_role", role);
  };
  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") window.localStorage.removeItem("omnimind_role");
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
