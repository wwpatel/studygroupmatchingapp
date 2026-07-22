import Link from "next/link";
import { NovaWordmark } from "@/components/nav/NovaWordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="bg-nova-burst flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novalogo.png" alt="" className="h-9 w-auto" />
          <NovaWordmark className="h-7 w-auto" />
        </Link>
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
