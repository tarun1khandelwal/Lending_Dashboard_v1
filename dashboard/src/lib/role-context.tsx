"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "pm" | "analyst" | "admin";

export interface RoleUser {
  name: string;
  role: UserRole;
  avatar: string; // initials
}

export const ROLE_USERS: Record<UserRole, RoleUser> = {
  pm: { name: "Tarun K.", role: "pm", avatar: "TK" },
  analyst: { name: "Ravi S.", role: "analyst", avatar: "RS" },
  admin: { name: "Priya M.", role: "admin", avatar: "PM" },
};

export const ROLE_META: Record<UserRole, { label: string; fullLabel: string; color: string; bg: string; ring: string; avatarBg: string }> = {
  pm: { label: "PM", fullLabel: "Product Manager", color: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-400", avatarBg: "bg-blue-600" },
  analyst: { label: "Analyst/DE", fullLabel: "Analyst / Data Engineer", color: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-400", avatarBg: "bg-violet-600" },
  admin: { label: "Admin", fullLabel: "Admin / Lead", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-400", avatarBg: "bg-emerald-600" },
};

interface RoleContextType {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  currentUser: RoleUser;
}

const RoleContext = createContext<RoleContextType>({
  activeRole: "pm",
  setActiveRole: () => {},
  currentUser: ROLE_USERS.pm,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRole] = useState<UserRole>("pm");
  return (
    <RoleContext.Provider value={{ activeRole, setActiveRole, currentUser: ROLE_USERS[activeRole] }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
