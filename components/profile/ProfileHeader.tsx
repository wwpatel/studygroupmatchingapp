"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";

const AVATAR_CHOICES = ["🦊", "🐬", "🦉", "🐢", "🦋", "🐙", "🦩", "🐝", "🌟", "🚀", "🌸", "🍀"];

export function ProfileHeader({
  name,
  avatar,
  editable,
}: {
  name: string;
  avatar: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatar ?? "🦊");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftName.trim() || name, avatar: draftAvatar }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const shownAvatar = editing ? draftAvatar : avatar ?? "🦊";

  return (
    <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
      <div className="flex size-20 items-center justify-center rounded-full bg-lavender-soft text-4xl">
        {shownAvatar}
      </div>
      <div className="mt-3 sm:ml-5 sm:mt-0">
        {editing ? (
          <div className="space-y-3">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-1.5 text-lg font-semibold text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
              maxLength={60}
            />
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {AVATAR_CHOICES.map((a) => (
                <button
                  key={a}
                  onClick={() => setDraftAvatar(a)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border text-xl transition-colors",
                    draftAvatar === a ? "border-lavender bg-lavender-soft" : "border-line",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-2 sm:justify-start">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-lavender px-3 py-1.5 text-sm font-semibold text-black"
              >
                <Check className="size-4" /> Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraftName(name);
                  setDraftAvatar(avatar ?? "🦊");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft"
              >
                <X className="size-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{name}</h1>
            {editable && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-line-soft hover:text-ink"
                aria-label="Edit profile"
              >
                <Pencil className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
