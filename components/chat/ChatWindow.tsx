"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/Button";
import { Send, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWindow({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch {
      setError("Nova couldn't respond just now. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen">
      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ember-soft">
              <Sparkles className="size-6 text-ember-dark" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">
              Ask Nova anything
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              Stuck on a problem? Nova will figure out exactly where, then explain it there.
            </p>
          </div>
        ) : (
          messages.map((m, i) => <ChatMessage key={i} role={m.role} content={m.content} />)
        )}
        {sending && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
              <Sparkles className="size-3.5 animate-pulse-soft" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-paper-raised px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-pulse-soft rounded-full bg-ink-faint"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-center text-sm text-danger md:px-8">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line bg-paper-raised p-4 md:px-8"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask about a concept, a homework problem, anything..."
            className="max-h-40 flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-ember/15"
          />
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
