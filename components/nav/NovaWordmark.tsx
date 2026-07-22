import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Renders both wordmark variants and lets CSS (html[data-theme]) pick the
// visible one — see .wordmark-* rules in globals.css. Doing this in CSS
// instead of JS keeps the logo correct on first paint in both themes with no
// hydration mismatch (a JS theme check left a stale src after hydration).
export function NovaWordmark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/novadarklogotext.png" alt="Nova" className={cn("wordmark-light", className)} style={style} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/novawordlogo.png" alt="Nova" className={cn("wordmark-dark", className)} style={style} />
    </>
  );
}
