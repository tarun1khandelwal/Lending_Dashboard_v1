"use client";

import { useState, useRef, useEffect } from "react";
import { InlineFilters } from "@/components/layout/global-filter-panel";
import { DateRangeSelector } from "@/components/layout/date-range-selector";
import { useRole, ROLE_USERS, ROLE_META, UserRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, User, Code2, Shield } from "lucide-react";

const roleIcons: Record<UserRole, typeof User> = {
  pm: User,
  analyst: Code2,
  admin: Shield,
};

function ProfileSwitcher() {
  const { activeRole, setActiveRole, currentUser } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const meta = ROLE_META[activeRole];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border transition-all hover:shadow-sm cursor-pointer",
          open ? "bg-muted border-border shadow-sm" : "bg-card border-border/60 hover:border-border"
        )}
      >
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0", meta.avatarBg)}>
          {currentUser.avatar}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold leading-tight">{currentUser.name}</p>
          <p className={cn("text-[9px] font-medium leading-tight", meta.color)}>{meta.fullLabel}</p>
        </div>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2.5 border-b border-border bg-muted/30">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Switch Role (Demo)</p>
          </div>
          {(Object.keys(ROLE_USERS) as UserRole[]).map((role) => {
            const user = ROLE_USERS[role];
            const rmeta = ROLE_META[role];
            const Icon = roleIcons[role];
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                onClick={() => { setActiveRole(role); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer",
                  isActive ? `${rmeta.bg}` : "hover:bg-muted/50"
                )}
              >
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0", rmeta.avatarBg)}>
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{user.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className={cn("h-3 w-3", rmeta.color)} />
                    <span className={cn("text-[10px] font-medium", rmeta.color)}>{rmeta.fullLabel}</span>
                  </div>
                </div>
                {isActive && <Check className={cn("h-4 w-4 shrink-0", rmeta.color)} />}
              </button>
            );
          })}
          <div className="px-3 py-2 border-t border-border bg-muted/20">
            <p className="text-[9px] text-muted-foreground text-center">Role affects available actions in Feedback &amp; Changes</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <InlineFilters />
        <div className="flex items-center gap-3">
          <DateRangeSelector />
          <div className="w-px h-5 bg-border" />
          <ProfileSwitcher />
        </div>
      </div>
    </div>
  );
}
