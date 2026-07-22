"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  group_id: string;
  student_id: string;
  content: string;
  created_at: string;
}

export function GroupChat({
  groupId,
  currentUserId,
  initialMessages,
  memberNames,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  memberNames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      group_id: groupId,
      student_id: currentUserId,
      content,
    });
    if (!error) {
      // Optimistically add if realtime hasn't delivered it yet.
    }
    setSending(false);
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-line bg-paper-raised">
      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-faint">
            No messages yet — say hi to your group.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.student_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                {!mine && (
                  <span className="mb-0.5 px-1 text-xs text-ink-faint">
                    {memberNames[m.student_id] ?? "Member"}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-ink text-paper" : "bg-line-soft text-ink",
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message your group..."
          className="flex-1 rounded-xl border border-line bg-paper px-3.5 py-2 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
        />
        <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
