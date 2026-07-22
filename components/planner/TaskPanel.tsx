"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { celebrate } from "@/components/gamification/Celebration";
import { Sparkles, Plus, X, Check, Loader2 } from "lucide-react";
import type { TodoItem, ProjectRef } from "./types";

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-blush-soft text-blush-deep",
  medium: "bg-butter-soft text-butter-deep",
  low: "bg-sage-soft text-sage-deep",
};

interface SuggestedTask {
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
}

export function TaskPanel({
  initialTodos,
  projects,
}: {
  initialTodos: TodoItem[];
  projects: ProjectRef[];
}) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function addTodo(t?: SuggestedTask) {
    const body = t
      ? { title: t.title, priority: t.priority, dueDate: t.dueDate || null }
      : { title: title.trim(), priority, dueDate: dueDate || null, projectId: projectId || null };
    if (!body.title) return;
    setAdding(true);
    const res = await fetch("/api/planner/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [...prev, data.todo]);
      if (!t) {
        setTitle("");
        setDueDate("");
        setProjectId("");
      } else {
        setSuggestions((prev) => prev.filter((s) => s !== t));
      }
    }
    setAdding(false);
  }

  async function toggle(todo: TodoItem) {
    const next = !todo.completed;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: next } : t)));
    const res = await fetch("/api/planner/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: todo.id, completed: next }),
    });
    if (res.ok) {
      const data = await res.json();
      if (next) celebrate({ xpAwarded: data.xpAwarded, newBadges: data.newBadges });
    }
  }

  async function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/planner/todos?id=${id}`, { method: "DELETE" });
  }

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/planner/suggest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't suggest tasks.");
      } else {
        setSuggestions(data.tasks ?? []);
      }
    } catch {
      setError("Something went wrong.");
    }
    setSuggesting(false);
  }

  const active = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      {/* Add task */}
      <div className="rounded-xl border border-line bg-paper-raised p-4">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a task..."
            className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
          />
          <Button size="sm" onClick={() => addTodo()} loading={adding} disabled={!title.trim()}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-ink outline-none"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-ink outline-none"
          />
          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-ink outline-none"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* AI suggest */}
      <div>
        <Button variant="secondary" size="sm" onClick={suggest} loading={suggesting} className="w-full">
          <Sparkles className="size-4" />
          Suggest tasks
        </Button>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        {suggestions.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl border border-lavender/40 bg-lavender-soft/40 p-3">
            <p className="text-xs font-semibold text-lavender-deep">Nova suggests</p>
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-paper-raised p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{s.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_STYLE[s.priority])}>
                      {s.priority}
                    </span>
                    {s.dueDate && <span className="text-[10px] text-ink-faint">by {formatDate(s.dueDate)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => addTodo(s)}
                  className="rounded-lg bg-lavender px-2 py-1 text-xs font-semibold text-black"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {active.length === 0 && done.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-faint">No tasks yet.</p>
        )}
        {active.map((t) => (
          <TaskRow key={t.id} todo={t} onToggle={() => toggle(t)} onRemove={() => remove(t.id)} />
        ))}
        {done.length > 0 && (
          <>
            <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Completed ({done.length})
            </p>
            {done.map((t) => (
              <TaskRow key={t.id} todo={t} onToggle={() => toggle(t)} onRemove={() => remove(t.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  todo,
  onToggle,
  onRemove,
}: {
  todo: TodoItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-line bg-paper-raised px-3 py-2.5">
      <button
        onClick={async () => {
          setBusy(true);
          await onToggle();
          setBusy(false);
        }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          todo.completed ? "border-sage bg-sage text-black" : "border-line hover:border-ink/40",
        )}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : todo.completed && <Check className="size-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", todo.completed ? "text-ink-faint line-through" : "text-ink")}>
          {todo.title}
        </p>
        {(todo.due_date || todo.priority !== "medium") && (
          <div className="mt-0.5 flex items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_STYLE[todo.priority])}>
              {todo.priority}
            </span>
            {todo.due_date && <span className="text-[10px] text-ink-faint">{formatDate(todo.due_date)}</span>}
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        aria-label="Delete task"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
