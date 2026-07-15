import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="bg-nova-burst flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-ink text-paper">
            <Sparkles className="size-5" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Nova
          </span>
        </Link>
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
