import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import type { QuizContent, FlashcardContent } from "@/lib/types/content";

export function ChatMessage({
  role,
  content,
  quiz,
  flashcards,
}: {
  role: "user" | "assistant";
  content: string;
  quiz?: { contentId: string; content: QuizContent };
  flashcards?: { contentId: string; content: FlashcardContent };
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          quiz || flashcards ? "w-full max-w-2xl" : "max-w-[85%]",
          isUser ? "bg-ink text-paper" : "bg-paper-raised border border-line text-ink",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-nova">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({ className, children, ...props }) => (
                  <code
                    className={cn(
                      "rounded bg-line-soft px-1 py-0.5 font-mono text-[0.85em]",
                      className,
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="scrollbar-thin overflow-x-auto rounded-xl bg-ink p-3 text-paper">
                    {children}
                  </pre>
                ),
                a: ({ children, ...props }) => (
                  <a className="text-lavender-deep underline underline-offset-2" {...props}>
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        {quiz && (
          <div className="mt-4">
            <QuizRunner contentId={quiz.contentId} content={quiz.content} />
          </div>
        )}
        {flashcards && (
          <div className="mt-4">
            <FlashcardDeck contentId={flashcards.contentId} content={flashcards.content} />
          </div>
        )}
      </div>
    </div>
  );
}
