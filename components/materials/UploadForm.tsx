"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { FileText, ClipboardPaste, UploadCloud } from "lucide-react";

export function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "pdf">("paste");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res: Response;
      if (mode === "pdf") {
        if (!file) {
          setError("Choose a PDF file first.");
          setLoading(false);
          return;
        }
        const form = new FormData();
        form.set("title", title);
        form.set("subject", subject);
        form.set("file", file);
        res = await fetch("/api/materials/upload", { method: "POST", body: form });
      } else {
        res = await fetch("/api/materials/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, subject, content }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setLoading(false);
        return;
      }
      router.push(`/materials/${data.materialId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="font-display text-lg font-semibold text-ink">Upload material</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Paste your notes or upload a PDF — Nova will generate a quiz, test, and flashcards.
        </p>

        <div className="mt-4 inline-flex rounded-lg border border-line bg-line-soft p-1">
          {(
            [
              { key: "paste", label: "Paste text", icon: ClipboardPaste },
              { key: "pdf", label: "Upload PDF", icon: FileText },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === key ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Unit 4: Cell Biology"
                required
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Biology"
                required
              />
            </div>
          </div>

          {mode === "paste" ? (
            <div>
              <Label htmlFor="content">Notes</Label>
              <Textarea
                id="content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your notes, textbook excerpt, or study guide here..."
                required
              />
            </div>
          ) : (
            <div>
              <Label>PDF file</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center transition-colors hover:border-ember/50 hover:bg-ember-soft/40"
              >
                <UploadCloud className="size-6 text-ink-faint" />
                <span className="text-sm font-medium text-ink">
                  {file ? file.name : "Click to choose a PDF"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Upload &amp; continue
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
