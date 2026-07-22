"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { COLOR_BG, COLOR_SOFT, COLOR_DEEP, type CalEvent } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  events,
  onAddClick,
  onDelete,
}: {
  events: CalEvent[];
  onAddClick: (date: string) => void;
  onDelete: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor));
      const end = endOfWeek(endOfMonth(cursor));
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(cursor);
    const end = endOfWeek(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor, view]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const move = (dir: number) =>
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));

  const selectedEvents = selected ? eventsByDay.get(selected) ?? [] : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="rounded-lg border border-line p-1.5 text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-40 text-center font-display text-lg font-semibold text-ink">
            {format(cursor, view === "month" ? "MMMM yyyy" : "'Week of' MMM d")}
          </h2>
          <button
            onClick={() => move(1)}
            className="rounded-lg border border-line p-1.5 text-ink-soft hover:text-ink"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            Today
          </button>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-line-soft p-1">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-paper-raised py-2 text-center text-xs font-semibold text-ink-faint">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = view === "week" || isSameMonth(day, cursor);
          return (
            <button
              key={key}
              onClick={() => {
                setSelected(key);
              }}
              onDoubleClick={() => onAddClick(key)}
              className={cn(
                "group relative min-h-24 bg-paper-raised p-1.5 text-left align-top transition-colors hover:bg-line-soft",
                !inMonth && "opacity-40",
                view === "week" && "min-h-40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) ? "bg-lavender text-black" : "text-ink",
                  )}
                >
                  {format(day, "d")}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick(key);
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Plus className="size-3.5 text-ink-faint hover:text-ink" />
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, view === "week" ? 6 : 3).map((e) => (
                  <div
                    key={e.id}
                    className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: COLOR_SOFT[e.color], color: COLOR_DEEP[e.color] }}
                    title={e.title}
                  >
                    {e.time ? `${e.time.slice(0, 5)} ` : ""}
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > (view === "week" ? 6 : 3) && (
                  <div className="px-1.5 text-[10px] text-ink-faint">
                    +{dayEvents.length - (view === "week" ? 6 : 3)} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected-day detail */}
      {selected && (
        <div className="mt-4 rounded-xl border border-line bg-paper-raised p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">
              {format(parseISO(selected), "EEEE, MMM d")}
            </h3>
            <button onClick={() => onAddClick(selected)} className="text-sm font-medium text-lavender-deep">
              + Add event
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">Nothing scheduled.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLOR_BG[e.color] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                    {(e.time || e.source) && (
                      <p className="text-xs text-ink-faint">
                        {e.time ? e.time.slice(0, 5) : ""}
                        {e.source ? `${e.time ? " · " : ""}${e.source === "test" ? "Test" : e.source === "plan" ? "Study plan" : "Group session"}` : ""}
                      </p>
                    )}
                  </div>
                  {e.type === "manual" && (
                    <button
                      onClick={() => onDelete(e.id)}
                      className="text-ink-faint hover:text-danger"
                      aria-label="Delete event"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
