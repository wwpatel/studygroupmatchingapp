"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  LayoutDashboard,
  MessageCircle,
  FileText,
  Radar,
  Users2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(auth)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Help", icon: MessageCircle },
  { href: "/materials", label: "Materials", icon: FileText },
  { href: "/skills", label: "Skill Profile", icon: Radar },
  { href: "/groups", label: "Study Groups", icon: Users2 },
];

export function Sidebar({ studentName }: { studentName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <>
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-ink text-paper">
          <Sparkles className="size-4.5" strokeWidth={2} />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Nova
        </span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-line-soft hover:text-ink",
              )}
            >
              <Icon className="size-4.5" strokeWidth={1.9} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <div className="px-3 py-1.5 text-sm font-medium text-ink-soft">
          {studentName}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
          >
            <LogOut className="size-4.5" strokeWidth={1.9} />
            Log out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-paper-raised px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-ink text-paper">
            <Sparkles className="size-4" strokeWidth={2} />
          </div>
          <span className="font-display text-base font-semibold text-ink">Nova</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="flex flex-col border-b border-line bg-paper-raised p-4 md:hidden">
          {content}
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper-raised p-4 md:flex">
        {content}
      </aside>
    </>
  );
}
