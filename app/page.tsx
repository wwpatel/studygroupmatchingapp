import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  MessageCircle,
  FileText,
  Radar,
  Users2,
  ArrowRight,
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-ink text-paper">
            <Sparkles className="size-5" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Nova
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="bg-nova-burst flex-1">
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-16 text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
            <Sparkles className="size-3.5 text-ember" />
            Built for AIRES @ UC Berkeley
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Study smarter,
            <br />
            <span className="text-ember">not alone.</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-ink-soft">
            Nova pinpoints exactly where you&apos;re stuck, turns your notes into
            real practice, and matches you with classmates whose strengths
            cover your gaps.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/signup">
              <Button size="lg">
                Start studying <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                I have an account
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: MessageCircle,
              title: "AI help chat",
              body: "Asks a quick diagnostic question first, then explains exactly where you're stuck.",
            },
            {
              icon: FileText,
              title: "Instant practice",
              body: "Upload notes — get a quiz, a full test, and flashcards, ready to take.",
            },
            {
              icon: Radar,
              title: "Skill profile",
              body: "A living map of your mastery per topic, updated after every attempt.",
            },
            {
              icon: Users2,
              title: "Complementary groups",
              body: "Matched with classmates who are strong exactly where you're not.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-line bg-paper-raised p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-ember-soft">
                <Icon className="size-4.5 text-ember-dark" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line px-6 py-6 text-center text-xs text-ink-faint">
        Nova — an AIRES @ UC Berkeley hackathon project.
      </footer>
    </div>
  );
}
