"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarView } from "./CalendarView";
import { TaskPanel } from "./TaskPanel";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { X } from "lucide-react";
import { COLOR_BG, type CalEvent, type TodoItem, type ProjectRef, type EventColor } from "./types";

const COLORS: EventColor[] = ["lavender", "blush", "sage", "butter"];

export function PlannerClient({
  initialEvents,
  initialTodos,
  projects,
}: {
  initialEvents: CalEvent[];
  initialTodos: TodoItem[];
  projects: ProjectRef[];
}) {
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [mobileTab, setMobileTab] = useState<"calendar" | "tasks">("calendar");

  // Add-event modal state.
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [color, setColor] = useState<EventColor>("lavender");
  const [saving, setSaving] = useState(false);

  function openAdd(date: string) {
    setModalDate(date);
    setTitle("");
    setTime("");
    setColor("lavender");
  }

  async function saveEvent() {
    if (!title.trim() || !modalDate) return;
    setSaving(true);
    const res = await fetch("/api/planner/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), date: modalDate, time: time || null, color }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvents((prev) => [...prev, { ...data.event, type: "manual" }]);
      setModalDate(null);
    }
    setSaving(false);
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/planner/events?id=${id}`, { method: "DELETE" });
  }

  return (
    <div>
      {/* Mobile tab toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-line bg-line-soft p-1 lg:hidden">
        {(["calendar", "tasks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              mobileTab === t ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className={cn(mobileTab === "tasks" && "hidden lg:block")}>
          <CalendarView events={events} onAddClick={openAdd} onDelete={deleteEvent} />
        </div>
        <div className={cn(mobileTab === "calendar" && "hidden lg:block")}>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Tasks</h2>
          <TaskPanel initialTodos={initialTodos} projects={projects} />
        </div>
      </div>

      {/* Add-event modal */}
      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">Add event</h3>
              <button onClick={() => setModalDate(null)} className="text-ink-faint hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{modalDate}</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="ev-title">Title</Label>
                <Input
                  id="ev-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEvent()}
                  placeholder="Study session, meeting..."
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="ev-time">Time (optional)</Label>
                <input
                  id="ev-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform",
                        color === c ? "scale-110 border-ink" : "border-transparent",
                      )}
                      style={{ background: COLOR_BG[c] }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalDate(null)}>
                Cancel
              </Button>
              <Button onClick={saveEvent} loading={saving} disabled={!title.trim()}>
                Add event
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
