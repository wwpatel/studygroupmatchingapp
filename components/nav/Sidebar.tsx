"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageCircle,
  FileText,
  Radar,
  Users2,
  Gamepad2,
  FolderKanban,
  CalendarDays,
  LogOut,
  Menu,
  X,
  Zap,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { SettingsMenu } from "./SettingsMenu";
import { NovaWordmark } from "./NovaWordmark";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Help", icon: MessageCircle },
  { href: "/materials", label: "Materials", icon: FileText },
  { href: "/arcade", label: "Arcade", icon: Gamepad2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/skills", label: "Skill Profile", icon: Radar },
  { href: "/groups", label: "Study Groups", icon: Users2 },
];

export function Sidebar({
  studentName,
  studentAvatar = null,
  todayXp = 0,
  currentStreak = 0,
}: {
  studentName: string;
  studentAvatar?: string | null;
  todayXp?: number;
  currentStreak?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <>
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/novalogo.png" alt="" className="h-8 w-auto" />
        <NovaWordmark className="h-6 w-auto" />
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
                  ? "bg-lavender text-black"
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
        <div className="mb-2 flex items-center gap-2 px-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-lavender-soft px-2.5 py-1 text-xs font-semibold text-lavender-deep">
            <Zap className="size-3.5" />
            {todayXp} XP today
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-butter-soft px-2.5 py-1 text-xs font-semibold text-butter-deep">
            <Flame className="size-3.5" />
            {currentStreak}
          </span>
        </div>
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors",
            pathname === "/profile" ? "bg-line-soft" : "hover:bg-line-soft",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-base">
            {studentAvatar ?? "🦊"}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{studentName}</span>
        </Link>
        <SettingsMenu />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novalogo.png" alt="" className="h-7 w-auto" />
          <NovaWordmark className="h-5 w-auto" />
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
