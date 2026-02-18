"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";

export function FloatingFeedback() {
  const pathname = usePathname();

  // Hide on the feedback page itself
  if (pathname === "/feedback") return null;

  return (
    <Link
      href="/feedback"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
    >
      <MessageSquarePlus className="h-4 w-4" />
      <span className="text-xs font-semibold hidden sm:inline">Feedback</span>
    </Link>
  );
}
