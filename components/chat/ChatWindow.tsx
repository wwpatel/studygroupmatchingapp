"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/Button";
import { Send, Sparkles, FileText, X } from "lucide-react";
import type { QuizContent, FlashcardContent } from "@/lib/types/content";

interface Message {
  role: "user" | "assistant";
  content: string;
  quiz?: { contentId: string; content: QuizContent };
  flashcards?: { contentId: string; content: FlashcardContent };
}

interface MaterialRef {
  id: string;
  title: string;
  subject: string;
}

export function ChatWindow({
  initialMessages,
  material,
  initialPrompt,
}: {
  initialMessages: Message[];
  material?: MaterialRef | null;
  initialPrompt?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeMaterial, setActiveMaterial] = useState<MaterialRef | null>(material ?? null);
  const [draft, setDraft] = useState(initialPrompt ?? "");
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
        body: JSON.stringify({ message: content, materialId: activeMaterial?.id }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      // In-chat quiz generation returns a single JSON payload instead of a
      // streamed reply, so it can carry the generated quiz alongside the text.
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: data.message,
            quiz: data.quiz,
            flashcards: data.flashcards,
          };
          return next;
        });
        return;
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
      {activeMaterial && (
        <div className="flex items-center gap-2 border-b border-line bg-lavender-soft px-4 py-2.5 text-sm text-lavender-deep md:px-8">
          <FileText className="size-4 shrink-0" />
          <span className="min-w-0 truncate">
            Chatting about <strong>{activeMaterial.title}</strong> ({activeMaterial.subject})
          </span>
          <button
            onClick={() => setActiveMaterial(null)}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium hover:bg-lavender/15"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      )}
      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blush-soft">
              <Sparkles className="size-6 text-blush-deep" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">
              Ask Nova anything
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {activeMaterial
                ? `Ask anything about "${activeMaterial.title}" — Nova will answer grounded in it.`
                : "Stuck on a problem? Nova will figure out exactly where, then explain it there."}
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} quiz={m.quiz} flashcards={m.flashcards} />
          ))
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
            className="max-h-40 flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
          />
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
