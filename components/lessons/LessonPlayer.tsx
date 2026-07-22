"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LessonSegment } from "@/lib/gemini/lesson";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const SEGMENT_TONES = ["lavender", "blush", "sage", "butter"] as const;
const TONE_SOFT: Record<string, string> = {
  lavender: "var(--color-lavender-soft)",
  blush: "var(--color-blush-soft)",
  sage: "var(--color-sage-soft)",
  butter: "var(--color-butter-soft)",
};
const TONE_DEEP: Record<string, string> = {
  lavender: "var(--color-lavender-deep)",
  blush: "var(--color-blush-deep)",
  sage: "var(--color-sage-deep)",
  butter: "var(--color-butter-deep)",
};
const TONE_BG: Record<string, string> = {
  lavender: "var(--color-lavender)",
  blush: "var(--color-blush)",
  sage: "var(--color-sage)",
  butter: "var(--color-butter)",
};

export function LessonPlayer({
  title,
  segments,
  materialId,
}: {
  title: string;
  segments: LessonSegment[];
  materialId: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seg = segments[index];
  const tone = SEGMENT_TONES[index % 4];

  useEffect(() => {
    setTtsAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  // Narrate the current segment, then advance (or finish) when it ends.
  const narrate = useCallback(() => {
    stopSpeech();
    const onDone = () => {
      if (index + 1 < segments.length) {
        setIndex((i) => i + 1);
      } else {
        setPlaying(false);
        setFinished(true);
      }
    };

    if (!muted && ttsAvailable) {
      const u = new SpeechSynthesisUtterance(segments[index].script);
      u.rate = 1;
      u.onend = onDone;
      // If speech is blocked/errors, fall back to a timed advance.
      u.onerror = () => {
        advanceTimer.current = setTimeout(onDone, 4000);
      };
      window.speechSynthesis.speak(u);
    } else {
      // Muted or no TTS: advance on a reading-time estimate.
      const words = segments[index].script.split(/\s+/).length;
      const ms = Math.max(4000, (words / 3) * 1000); // ~180 wpm
      advanceTimer.current = setTimeout(onDone, ms);
    }
  }, [index, muted, segments, stopSpeech, ttsAvailable]);

  // Drive narration whenever we're playing and land on a new segment.
  useEffect(() => {
    if (playing) narrate();
    return stopSpeech;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, muted]);

  function togglePlay() {
    if (finished) {
      setIndex(0);
      setFinished(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  function go(delta: number) {
    stopSpeech();
    setFinished(false);
    setIndex((i) => Math.max(0, Math.min(segments.length - 1, i + delta)));
  }

  function restart() {
    stopSpeech();
    setFinished(false);
    setIndex(0);
    setPlaying(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-10">
      <Link
        href={materialId ? `/materials/${materialId}` : "/materials"}
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to material
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <Sparkles className="size-5 text-lavender-deep" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        A narrated mini-lesson · {segments.length} segments
      </p>

      {/* Slide */}
      <div
        className="relative mt-6 overflow-hidden rounded-2xl border border-line p-8"
        style={{ background: TONE_SOFT[tone] }}
      >
        {finished ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto size-10" style={{ color: TONE_DEEP[tone] }} />
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink">Lesson complete!</h2>
            <p className="mt-1 text-sm text-ink-soft">Nicely done. Replay any time.</p>
            <button
              onClick={restart}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lavender px-4 py-2.5 text-sm font-semibold text-black"
            >
              <RotateCcw className="size-4" /> Replay
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                style={{ background: TONE_BG[tone], color: "#000" }}
              >
                {index + 1} / {segments.length}
              </span>
              <span className="text-xs font-medium" style={{ color: TONE_DEEP[tone] }}>
                {seg.visualHint}
              </span>
            </div>

            <h2 className="mt-5 font-display text-2xl font-bold text-ink">{seg.title}</h2>

            {seg.keyTerms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {seg.keyTerms.map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: "var(--color-paper-raised)", color: TONE_DEEP[tone] }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 text-base leading-relaxed text-ink">{seg.script}</p>

            {playing && !muted && ttsAvailable && (
              <div className="mt-4 flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-1 animate-pulse-soft rounded-full"
                    style={{
                      height: `${8 + (i % 3) * 6}px`,
                      background: TONE_DEEP[tone],
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {segments.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              stopSpeech();
              setFinished(false);
              setIndex(i);
            }}
            className={cn("h-1.5 rounded-full transition-all", i === index && !finished ? "w-6" : "w-1.5")}
            style={{ background: i <= index ? "var(--color-lavender)" : "var(--color-line)" }}
            aria-label={`Go to segment ${i + 1}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0 && !finished}
          className="rounded-full border border-line p-2.5 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
        >
          <SkipBack className="size-5" />
        </button>
        <button
          onClick={togglePlay}
          className="flex size-14 items-center justify-center rounded-full bg-lavender text-black transition-transform hover:scale-105"
        >
          {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
        </button>
        <button
          onClick={() => go(1)}
          disabled={index >= segments.length - 1}
          className="rounded-full border border-line p-2.5 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
        >
          <SkipForward className="size-5" />
        </button>
        <button
          onClick={() => setMuted((m) => !m)}
          className={cn(
            "ml-2 rounded-full border p-2.5 transition-colors",
            muted ? "border-line text-ink-faint" : "border-lavender text-lavender-deep",
          )}
          aria-label={muted ? "Unmute narration" : "Mute narration"}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>
      {!ttsAvailable && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          Your browser doesn&apos;t support voice narration — slides advance on a timer instead.
        </p>
      )}
    </div>
  );
}
