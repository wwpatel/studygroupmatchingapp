"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Sparkles,
  Radar,
  Users2,
  ArrowRight,
  Upload,
  FileText,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { NovaWordmark } from "@/components/nav/NovaWordmark";

// "Nova Landing v2". Black/white base with the app's lavender/blush/sage/
// butter accents, same as the rest of the app — fully theme-aware (the hero
// canvas grid and radial vignette adapt to light/dark too). Space Grotesk +
// Inter. Interactions: a cursor-warp notebook grid in the hero, a nav pill
// that shrinks on scroll, scroll-reveal fade-ins, and CSS-3D depth scenes
// (product cluster, step visuals, feature tilt) — no WebGL, all self-contained.

const HEADING = "var(--font-space-grotesk), system-ui, sans-serif";
const BODY = "var(--font-inter), system-ui, sans-serif";

// App design tokens (see app/globals.css). Key names kept as ember/gold/teal
// for brevity; values point at the lavender/butter/sage accent tokens.
const C = {
  paper: "var(--color-paper)",
  raised: "var(--color-paper-raised)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-ink-soft)",
  inkFaint: "var(--color-ink-faint)",
  line: "var(--color-line)",
  lineSoft: "var(--color-line-soft)",
  ember: "var(--color-lavender)",
  emberDark: "var(--color-lavender-deep)",
  emberSoft: "var(--color-lavender-soft)",
  gold: "var(--color-butter)",
  goldDark: "var(--color-butter-deep)",
  goldSoft: "var(--color-butter-soft)",
  teal: "var(--color-sage)",
  tealDark: "var(--color-sage-deep)",
  tealSoft: "var(--color-sage-soft)",
  plum: "var(--color-blush)",
  plumDark: "var(--color-blush-deep)",
  plumSoft: "var(--color-blush-soft)",
};

// Page background/text mirror the app's base tokens directly, so the landing
// page (including the hero) follows light/dark mode like every other page.
const LP_BG = "var(--color-paper)";
const LP_TEXT = "var(--color-ink)";
const LP_TEXT_SOFT = "var(--color-ink-soft)";
const LP_TEXT_FAINT = "var(--color-ink-faint)";
const LP_BORDER = "var(--color-line)";

const PILLARS = [
  "AI help chatbot",
  "Quizzes & flashcards",
  "Skill-based matching",
  "Progress reports",
];

const FEATURES = [
  {
    kicker: "CHATBOT",
    tone: "ember" as const,
    title: "AI help that diagnoses first",
    desc: "Asks a diagnostic question to find the real gap before it explains anything — and stays on topic.",
  },
  {
    kicker: "GENERATOR",
    tone: "gold" as const,
    title: "Quizzes from your own materials",
    desc: "Upload notes or slides; Nova generates quizzes, practice tests, and flashcards you can retake.",
  },
  {
    kicker: "MATCHING",
    tone: "teal" as const,
    title: "Grouped by what you're missing",
    desc: "Mastery scores from real testing match you with people whose strengths cover your gaps, and explain why.",
  },
  {
    kicker: "FOLLOW-THROUGH",
    tone: "plum" as const,
    title: "A plan for every session",
    desc: "Each group gets a structured agenda, plus check-ins that feed back into everyone's skill profile.",
  },
];

const STEPS = [
  {
    title: "Upload your material",
    desc: "Drop in notes, slides, or a chapter — Nova reads it and builds quizzes and flashcards from it.",
    kind: "upload" as const,
  },
  {
    title: "Build a real skill profile",
    desc: "Every attempt scores you per topic, so your profile reflects what you actually know.",
    kind: "profile" as const,
  },
  {
    title: "Get matched, not just paired",
    desc: "Nova groups you with complementary students and hands the group a session agenda.",
    kind: "group" as const,
  },
];

type SectionKey = "slot" | "pillars" | "features" | "steps";

type Tone = "ember" | "gold" | "teal" | "plum";
const toneChip: Record<Tone, CSSProperties> = {
  ember: { background: C.emberSoft, color: C.emberDark },
  gold: { background: C.goldSoft, color: C.goldDark },
  teal: { background: C.tealSoft, color: C.tealDark },
  plum: { background: C.plumSoft, color: C.plumDark },
};
const toneBar: Record<Tone, string> = { ember: C.ember, gold: C.gold, teal: C.teal, plum: C.plum };

/* ─── 3D: floating product scene ──────────────────────────────────────────── */

function panelStyle(z: number): CSSProperties {
  return {
    position: "absolute",
    transformStyle: "preserve-3d",
    transform: `translateZ(${z}px)`,
    background: C.raised,
    border: `1px solid ${C.line}`,
    borderRadius: "18px",
    boxShadow: `0 ${18 + z / 4}px ${40 + z / 3}px rgba(0,0,0,0.12)`,
    padding: "16px 18px",
  };
}

function MiniBar({ label, pct, tone }: { label: string; pct: number; tone: Tone }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: C.inkSoft,
          marginBottom: "5px",
          fontWeight: 500,
        }}
      >
        <span>{label}</span>
        <span style={{ color: C.ink, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "999px", background: C.lineSoft }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "999px",
            background: toneBar[tone],
          }}
        />
      </div>
    </div>
  );
}

function Avatar({ initials, tone }: { initials: string; tone: Tone }) {
  return (
    <div
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 700,
        color: toneChip[tone].color as string,
        background: toneChip[tone].background as string,
        border: `2px solid ${C.raised}`,
        fontFamily: HEADING,
      }}
    >
      {initials}
    </div>
  );
}

function Scene3D() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 10, ry: px * 16 });
  }, []);
  const onLeave = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  return (
    <div
      ref={stageRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        perspective: "1300px",
        height: "520px",
        borderRadius: "28px",
        border: `1px solid ${C.line}`,
        background:
          "radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--color-lavender) 8%, var(--color-paper-raised)) 0%, var(--color-paper) 60%)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "640px",
          maxWidth: "92%",
          height: "380px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="float-deck" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
          {/* Skill profile — back layer */}
          <div style={{ ...panelStyle(0), left: "2%", top: "6%", width: "262px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
                fontFamily: HEADING,
                fontSize: "13px",
                fontWeight: 600,
                color: C.ink,
              }}
            >
              <Radar size={15} style={{ color: C.emberDark }} strokeWidth={2} />
              Skill profile
            </div>
            <MiniBar label="Cell Biology" pct={88} tone="ember" />
            <MiniBar label="Genetics" pct={42} tone="plum" />
            <MiniBar label="Ecology" pct={67} tone="teal" />
          </div>

          {/* Practice quiz — mid layer */}
          <div style={{ ...panelStyle(80), right: "1%", top: "0%", width: "236px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "3px 8px",
                borderRadius: "6px",
                ...toneChip.ember,
                marginBottom: "12px",
              }}
            >
              QUIZ
            </span>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: 600,
                color: C.ink,
                lineHeight: 1.35,
              }}
            >
              Which organelle produces ATP?
            </p>
            {[
              { t: "Ribosome", ok: false },
              { t: "Mitochondria", ok: true },
              { t: "Nucleus", ok: false },
            ].map((o) => (
              <div
                key={o.t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: 500,
                  padding: "8px 11px",
                  marginBottom: "7px",
                  borderRadius: "9px",
                  border: `1px solid ${o.ok ? C.emberDark : C.line}`,
                  background: o.ok ? C.emberSoft : C.raised,
                  color: o.ok ? C.emberDark : C.inkSoft,
                }}
              >
                {o.t}
                {o.ok && <Check size={14} strokeWidth={2.5} />}
              </div>
            ))}
          </div>

          {/* Group match — front layer */}
          <div style={{ ...panelStyle(150), left: "12%", bottom: "2%", width: "270px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                fontFamily: HEADING,
                fontSize: "13px",
                fontWeight: 600,
                color: C.ink,
              }}
            >
              <Users2 size={15} style={{ color: C.tealDark }} strokeWidth={2} />
              Your study group
            </div>
            <div style={{ display: "flex", marginBottom: "12px" }}>
              {[
                { i: "AV", t: "ember" as Tone },
                { i: "BN", t: "plum" as Tone },
                { i: "CK", t: "teal" as Tone },
              ].map((a, idx) => (
                <div key={a.i} style={{ marginLeft: idx === 0 ? 0 : "-8px" }}>
                  <Avatar initials={a.i} tone={a.t} />
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
                background: C.tealSoft,
                color: C.tealDark,
                padding: "8px 11px",
                borderRadius: "9px",
              }}
            >
              Ben covers your <strong>Genetics</strong> gap.
            </div>
          </div>

          {/* Floating accent chip — top layer */}
          <div
            className="chip-float"
            style={{
              ...panelStyle(210),
              right: "6%",
              bottom: "14%",
              padding: "8px 13px",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              borderRadius: "999px",
            }}
          >
            <Sparkles size={14} style={{ color: C.goldDark }} strokeWidth={2} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: C.ink }}>New match</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3D: per-step visual ─────────────────────────────────────────────────── */

function StepVisual({ kind }: { kind: "upload" | "profile" | "group" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setT({
      rx: -((e.clientY - r.top) / r.height - 0.5) * 14,
      ry: ((e.clientX - r.left) / r.width - 0.5) * 18,
    });
  }, []);
  const onLeave = useCallback(() => setT({ rx: 0, ry: 0 }), []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        flex: "1.2",
        minWidth: "280px",
        height: "230px",
        borderRadius: "16px",
        perspective: "900px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--color-lavender) 6%, var(--color-paper-raised)), var(--color-paper))",
        border: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          width: "200px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
          transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            background: C.raised,
            border: `1px solid ${C.line}`,
            borderRadius: "14px",
            padding: "18px",
            boxShadow: "0 20px 44px rgba(0,0,0,0.14)",
            transformStyle: "preserve-3d",
          }}
        >
          {kind === "upload" && (
            <>
              <div
                style={{
                  display: "inline-flex",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  alignItems: "center",
                  justifyContent: "center",
                  background: C.emberSoft,
                  marginBottom: "14px",
                  transform: "translateZ(28px)",
                }}
              >
                <Upload size={18} style={{ color: C.emberDark }} strokeWidth={2} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <FileText size={15} style={{ color: C.inkFaint }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: C.ink }}>bio_notes.pdf</span>
              </div>
              {[70, 92, 55].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: "6px",
                    width: `${w}%`,
                    borderRadius: "999px",
                    background: C.lineSoft,
                    marginBottom: "7px",
                  }}
                />
              ))}
            </>
          )}

          {kind === "profile" && (
            <>
              <div
                style={{
                  fontFamily: HEADING,
                  fontSize: "12px",
                  fontWeight: 600,
                  color: C.ink,
                  marginBottom: "14px",
                }}
              >
                Mastery by topic
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "10px",
                  height: "84px",
                  transform: "translateZ(24px)",
                }}
              >
                {[
                  { h: 80, t: "ember" as Tone },
                  { h: 45, t: "gold" as Tone },
                  { h: 66, t: "teal" as Tone },
                  { h: 90, t: "plum" as Tone },
                ].map((b, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${b.h}%`,
                      borderRadius: "6px 6px 3px 3px",
                      background: toneBar[b.t],
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {kind === "group" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "14px",
                  transform: "translateZ(28px)",
                }}
              >
                {[
                  { i: "AV", t: "ember" as Tone },
                  { i: "BN", t: "plum" as Tone },
                  { i: "CK", t: "teal" as Tone },
                ].map((a, idx) => (
                  <div key={a.i} style={{ marginLeft: idx === 0 ? 0 : "-10px" }}>
                    <Avatar initials={a.i} tone={a.t} />
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  textAlign: "center",
                  color: C.tealDark,
                  background: C.tealSoft,
                  padding: "7px 10px",
                  borderRadius: "9px",
                  fontWeight: 500,
                }}
              >
                Complementary match
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 3D-tilt feature card ────────────────────────────────────────────────── */

function FeatureCard({
  f,
  visible,
  delay,
}: {
  f: (typeof FEATURES)[number];
  visible: boolean | undefined;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, hover: false });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setT({
      rx: -((e.clientY - r.top) / r.height - 0.5) * 8,
      ry: ((e.clientX - r.left) / r.width - 0.5) * 10,
      hover: true,
    });
  }, []);
  const onLeave = useCallback(() => setT({ rx: 0, ry: 0, hover: false }), []);

  return (
    <div
      style={{
        perspective: "900px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          padding: "30px 26px",
          borderRadius: "20px",
          border: `1px solid ${C.line}`,
          background: C.raised,
          height: "100%",
          cursor: "default",
          transformStyle: "preserve-3d",
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateY(${t.hover ? -4 : 0}px)`,
          boxShadow: t.hover
            ? "0 18px 44px rgba(0,0,0,0.12)"
            : "0 1px 2px rgba(0,0,0,0.04)",
          transition:
            "transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "4px 10px",
            borderRadius: "6px",
            ...toneChip[f.tone],
            transform: "translateZ(20px)",
          }}
        >
          {f.kicker}
        </span>
        <h3
          style={{
            fontFamily: HEADING,
            fontWeight: 600,
            fontSize: "20px",
            margin: "16px 0 10px",
            letterSpacing: "-0.01em",
            color: C.ink,
          }}
        >
          {f.title}
        </h3>
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: C.inkSoft, margin: 0 }}>
          {f.desc}
        </p>
      </div>
    </div>
  );
}

/* ─── For Schools: inquiry form ───────────────────────────────────────────── */

const inquiryInputStyle: CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: `1px solid ${C.line}`,
  background: C.paper,
  color: C.ink,
  padding: "11px 14px",
  fontSize: "14px",
  fontFamily: BODY,
};

function SchoolInquiryForm() {
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — left empty by real visitors
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/school-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolName, contactName, email, studentCount, message, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send your inquiry. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        style={{
          borderRadius: "20px",
          border: `1px solid ${C.line}`,
          background: C.raised,
          padding: "40px 28px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "32px" }}>✅</div>
        <h3 style={{ fontFamily: HEADING, fontWeight: 600, fontSize: "20px", margin: "12px 0 6px", color: C.ink }}>
          Thanks — we&apos;ll be in touch
        </h3>
        <p style={{ fontSize: "14px", color: C.inkSoft, margin: 0 }}>
          Your inquiry is on its way. Someone from our team will reply soon.
        </p>
      </div>
    );
  }

  const fields: {
    id: string;
    label: string;
    value: string;
    set: (v: string) => void;
    type?: string;
    required?: boolean;
    placeholder: string;
  }[] = [
    { id: "schoolName", label: "School / district name", value: schoolName, set: setSchoolName, required: true, placeholder: "Lincoln High School" },
    { id: "contactName", label: "Your name", value: contactName, set: setContactName, required: true, placeholder: "Jordan Lee" },
    { id: "email", label: "Work email", value: email, set: setEmail, type: "email", required: true, placeholder: "you@school.edu" },
    { id: "studentCount", label: "Approx. number of students (optional)", value: studentCount, set: setStudentCount, placeholder: "e.g. 400" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderRadius: "20px",
        border: `1px solid ${C.line}`,
        background: C.raised,
        padding: "28px",
      }}
    >
      {/* Honeypot field — hidden from real visitors, bots often fill it in. */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {fields.map((f) => (
          <div key={f.id} style={{ gridColumn: f.id === "email" || f.id === "studentCount" ? undefined : "1 / -1" }}>
            <label
              htmlFor={f.id}
              style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.inkSoft, marginBottom: "6px" }}
            >
              {f.label}
            </label>
            <input
              id={f.id}
              type={f.type ?? "text"}
              required={f.required}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="inquiry-input"
              style={inquiryInputStyle}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: "16px" }}>
        <label
          htmlFor="message"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.inkSoft, marginBottom: "6px" }}
        >
          What would you like to know?
        </label>
        <textarea
          id="message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your school and what you're hoping Nova can help with..."
          className="inquiry-input"
          style={{ ...inquiryInputStyle, resize: "vertical", fontFamily: BODY }}
        />
      </div>

      {error && (
        <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--color-danger)" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inquiry-submit"
        style={{
          marginTop: "18px",
          width: "100%",
          borderRadius: "999px",
          border: "none",
          background: C.ember,
          color: "#000",
          fontSize: "15px",
          fontWeight: 600,
          padding: "13px 20px",
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
      >
        {status === "sending" ? "Sending..." : "Send inquiry"}
      </button>
    </form>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export function LandingClient() {
  const { theme, toggleTheme } = useTheme();
  const [navScrolled, setNavScrolled] = useState(false);
  const [visible, setVisible] = useState<Partial<Record<SectionKey, boolean>>>({});

  const heroRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const mouse = useRef({ x: -9999, y: -9999, cx: -9999, cy: -9999, s: 0, ts: 0 });
  const dims = useRef({ cw: 0, ch: 0, dpr: 1, needsDraw: true });

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setNavScrolled(window.scrollY > 40);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const key = (e.target as HTMLElement).dataset.key as SectionKey | undefined;
            if (key && !next[key]) {
              next[key] = true;
              changed = true;
              observer.unobserve(e.target);
            }
          }
          return changed ? next : prev;
        });
      },
      { threshold: 0.12 },
    );
    for (const [key, el] of Object.entries(sectionRefs.current)) {
      if (el) {
        el.dataset.key = key;
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!hero || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const R = 150;
    const AMP = 42;

    const warp = (px: number, py: number): [number, number] => {
      const m = mouse.current;
      const dx = px - m.cx;
      const dy = py - m.cy;
      const d2 = dx * dx + dy * dy;
      if (m.s < 0.003 || d2 > R * R * 9) return [px, py];
      const d = Math.sqrt(d2) || 0.001;
      const f = m.s * AMP * Math.exp(-d2 / (R * R));
      return [px + (dx / d) * f, py + (dy / d) * f];
    };

    const drawGrid = () => {
      const { cw: w, ch: h, dpr } = dims.current;
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // Faint notebook grid — light ink lines on white, light lines on black.
      ctx.strokeStyle = theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
      ctx.lineWidth = 1;
      const spacing = 30;
      const step = 10;
      ctx.beginPath();
      for (let x = 0.5; x <= w; x += spacing) {
        let first = true;
        for (let y = 0; y <= h + step; y += step) {
          const [px, py] = warp(x, Math.min(y, h));
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else ctx.lineTo(px, py);
        }
      }
      for (let y = 0.5; y <= h; y += spacing) {
        let first = true;
        for (let x = 0; x <= w + step; x += step) {
          const [px, py] = warp(Math.min(x, w), y);
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      dims.current = { cw: w, ch: h, dpr, needsDraw: true };
    };

    let rafId = 0;
    const tick = () => {
      const m = mouse.current;
      m.cx += (m.x - m.cx) * 0.14;
      m.cy += (m.y - m.cy) * 0.14;
      m.s += (m.ts - m.s) * 0.08;
      if (m.s > 0.002 || dims.current.needsDraw) {
        drawGrid();
        dims.current.needsDraw = m.s > 0.002;
      }
      rafId = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(sizeCanvas);
    ro.observe(hero);
    sizeCanvas();
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [theme]);

  const onHeroMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const m = mouse.current;
    m.x = e.clientX - rect.left;
    m.y = e.clientY - rect.top;
    if (m.ts === 0) {
      m.cx = m.x;
      m.cy = m.y;
    }
    m.ts = 1;
  }, []);
  const onHeroLeave = useCallback(() => {
    mouse.current.ts = 0;
  }, []);

  const setSectionRef = (key: SectionKey) => (el: HTMLDivElement | null) => {
    sectionRefs.current[key] = el;
  };
  const fadeUp = (isVisible: boolean | undefined, delay: number): CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  const navWrapStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: "34px",
    padding: navScrolled ? "12px 26px" : "20px 48px",
    margin: navScrolled ? "14px auto 0" : "0 auto",
    maxWidth: navScrolled ? "840px" : "1160px",
    borderRadius: "999px",
    background: navScrolled
      ? `color-mix(in srgb, ${LP_BG} 82%, transparent)`
      : "transparent",
    backdropFilter: navScrolled ? "blur(14px)" : "none",
    WebkitBackdropFilter: navScrolled ? "blur(14px)" : "none",
    boxShadow: navScrolled
      ? `0 0 0 1px ${LP_BORDER}, 0 10px 30px rgba(0,0,0,0.35)`
      : "none",
    transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
  };

  return (
    <div
      className="nova-lp"
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: LP_BG,
        backgroundImage:
          "linear-gradient(to right, color-mix(in srgb, var(--color-ink) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-ink) 6%, transparent) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
        color: LP_TEXT,
        fontFamily: BODY,
      }}
    >
      <style>{`
        .nova-lp a { text-decoration: none; }
        .nova-lp ::selection { background: var(--color-lavender-deep); color: #fff; }
        .nova-lp .nav-link { color: ${LP_TEXT_SOFT}; transition: color 0.2s ease; }
        .nova-lp .nav-link:hover { color: var(--color-lavender-deep); }
        .nova-lp .login-pill:hover { border-color: var(--color-lavender) !important; color: var(--color-lavender-deep) !important; }
        .nova-lp .cta-primary:hover { background: color-mix(in srgb, var(--color-lavender) 85%, black) !important; transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.22) !important; }
        .nova-lp .cta-secondary:hover { border-color: var(--color-ink) !important; transform: translateY(-2px); }
        .nova-lp .step-card:hover { border-color: var(--color-lavender) !important; }
        .nova-lp .inquiry-input { transition: border-color 0.15s ease; }
        .nova-lp .inquiry-input:focus { outline: none; border-color: var(--color-lavender) !important; }
        .nova-lp .inquiry-submit:hover:not(:disabled) { background: color-mix(in srgb, var(--color-lavender) 85%, black) !important; }
        .nova-lp .inquiry-submit:disabled { opacity: 0.6; cursor: default; }
        .nova-lp .footer-link { color: ${LP_TEXT_SOFT}; transition: color 0.2s ease; }
        .nova-lp .footer-link:hover { color: var(--color-lavender-deep); }
        @keyframes novaFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes novaFloatChip { 0%,100% { transform: translateZ(210px) translateY(0); } 50% { transform: translateZ(210px) translateY(-12px); } }
        .nova-lp .float-deck { animation: novaFloat 7s ease-in-out infinite; }
        .nova-lp .chip-float { animation: novaFloatChip 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nova-lp .float-deck, .nova-lp .chip-float { animation: none; }
        }
      `}</style>

      {/* NAV */}
      <div style={navWrapStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novalogo.png" alt="Nova" style={{ height: "26px", width: "auto" }} />
          <NovaWordmark style={{ height: "20px", width: "auto" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "34px", marginLeft: "auto" }}>
          <a href="#features" className="nav-link" style={{ fontSize: "14px", fontWeight: 500 }}>
            Features
          </a>
          <a href="#how" className="nav-link" style={{ fontSize: "14px", fontWeight: 500 }}>
            How it works
          </a>
          <a href="#schools" className="nav-link" style={{ fontSize: "14px", fontWeight: 500 }}>
            For schools
          </a>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="login-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            color: LP_TEXT,
            border: `1px solid ${LP_BORDER}`,
            borderRadius: "999px",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link
          href="/login"
          className="login-pill"
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: LP_TEXT,
            padding: "8px 16px",
            border: `1px solid ${LP_BORDER}`,
            borderRadius: "999px",
            transition: "all 0.2s ease",
          }}
        >
          Log in
        </Link>
      </div>

      {/* HERO */}
      <div
        ref={heroRef}
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
        style={{
          position: "relative",
          minHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, ${LP_BG} 92%, transparent), color-mix(in srgb, ${LP_BG} 55%, transparent) 55%, transparent 80%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1
            style={{
              fontFamily: HEADING,
              fontWeight: 700,
              fontSize: "clamp(44px, 7vw, 84px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              margin: "0 0 28px",
              maxWidth: "800px",
              color: LP_TEXT,
            }}
          >
            Study smarter,
            <br />
            <span style={{ color: C.emberDark }}>not alone.</span>
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: LP_TEXT_SOFT,
              lineHeight: 1.6,
              maxWidth: "540px",
              margin: "0 0 40px",
            }}
          >
            Your gaps, mapped. Your study group, matched to fill them.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/signup"
              className="cta-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "15px 28px",
                borderRadius: "999px",
                background: C.ember,
                color: "#000",
                fontSize: "16px",
                fontWeight: 600,
                boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
                transition: "transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              Start studying <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link
              href="/login"
              className="cta-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "15px 26px",
                borderRadius: "999px",
                background: C.raised,
                border: `1px solid ${C.line}`,
                color: C.ink,
                fontSize: "16px",
                fontWeight: 600,
                transition: "all 0.2s ease",
              }}
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>

      {/* PRODUCT SCENE (CSS-3D) */}
      <div ref={setSectionRef("slot")} style={{ padding: "40px 24px 100px", ...fadeUp(visible.slot, 0) }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <Scene3D />
        </div>
      </div>

      {/* WHAT'S INSIDE */}
      <div
        ref={setSectionRef("pillars")}
        style={{
          padding: "56px 24px",
          borderTop: `1px solid ${LP_BORDER}`,
          borderBottom: `1px solid ${LP_BORDER}`,
          ...fadeUp(visible.pillars, 0),
        }}
      >
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: LP_TEXT_FAINT,
            textAlign: "center",
            margin: "0 0 26px",
          }}
        >
          What&apos;s inside
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {PILLARS.map((name, i) => {
            const tone: Tone = (["ember", "gold", "teal", "plum"] as Tone[])[i % 4];
            return (
              <span
                key={name}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "9px 18px",
                  borderRadius: "999px",
                  ...toneChip[tone],
                }}
              >
                {name}
              </span>
            );
          })}
        </div>
      </div>

      {/* FEATURES */}
      <div
        id="features"
        ref={setSectionRef("features")}
        style={{ padding: "120px 24px", maxWidth: "1160px", margin: "0 auto" }}
      >
        <div style={{ maxWidth: "560px", margin: "0 0 60px" }}>
          <h6
            style={{
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.emberDark,
              margin: "0 0 12px",
              fontWeight: 600,
            }}
          >
            Features
          </h6>
          <h2
            style={{
              fontFamily: HEADING,
              fontWeight: 700,
              fontSize: "clamp(30px, 4vw, 46px)",
              letterSpacing: "-0.02em",
              margin: "0 0 16px",
              color: LP_TEXT,
            }}
          >
            Built on real skill data, not friend groups
          </h2>
          <p style={{ fontSize: "17px", color: LP_TEXT_SOFT, lineHeight: 1.6, margin: 0 }}>
            Nova tests what you actually know, then puts you with people who fill the gaps.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
          }}
        >
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} f={f} visible={visible.features} delay={i * 0.1} />
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div
        id="how"
        ref={setSectionRef("steps")}
        style={{ padding: "40px 24px 140px", maxWidth: "1160px", margin: "0 auto" }}
      >
        <div style={{ maxWidth: "560px", margin: "0 0 60px" }}>
          <h6
            style={{
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.emberDark,
              margin: "0 0 12px",
              fontWeight: 600,
            }}
          >
            How it works
          </h6>
          <h2
            style={{
              fontFamily: HEADING,
              fontWeight: 700,
              fontSize: "clamp(30px, 4vw, 46px)",
              letterSpacing: "-0.02em",
              margin: 0,
              color: LP_TEXT,
            }}
          >
            From upload to study group in three steps
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={fadeUp(visible.steps, i * 0.12)}>
              <div
                className="step-card"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "40px",
                  flexDirection: i % 2 === 1 ? "row-reverse" : "row",
                  padding: "36px",
                  borderRadius: "24px",
                  border: `1px solid ${C.line}`,
                  background: C.raised,
                  transition: "border-color 0.3s ease",
                }}
              >
                <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
                  <div
                    style={{
                      fontFamily: HEADING,
                      fontWeight: 700,
                      fontSize: "14px",
                      color: [C.emberDark, C.plumDark, C.tealDark][i % 3],
                      marginBottom: "12px",
                    }}
                  >
                    STEP 0{i + 1}
                  </div>
                  <h3
                    style={{
                      fontFamily: HEADING,
                      fontWeight: 600,
                      fontSize: "24px",
                      margin: "0 0 12px",
                      letterSpacing: "-0.01em",
                      color: C.ink,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "15px", lineHeight: 1.65, color: C.inkSoft, margin: 0 }}>
                    {s.desc}
                  </p>
                </div>
                <StepVisual kind={s.kind} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOR SCHOOLS */}
      <div id="schools" style={{ borderTop: `1px solid ${LP_BORDER}`, padding: "100px 24px" }}>
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "48px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: "300px" }}>
            <h6
              style={{
                fontSize: "12px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.emberDark,
                margin: "0 0 12px",
                fontWeight: 600,
              }}
            >
              For schools
            </h6>
            <h2
              style={{
                fontFamily: HEADING,
                fontWeight: 700,
                fontSize: "clamp(28px, 3.6vw, 42px)",
                letterSpacing: "-0.02em",
                margin: "0 0 16px",
                color: LP_TEXT,
              }}
            >
              Bring Nova to your school
            </h2>
            <p style={{ fontSize: "16px", color: LP_TEXT_SOFT, lineHeight: 1.65, margin: "0 0 24px" }}>
              Nova helps teachers see exactly where each student is stuck and pairs classmates so gaps get
              covered — not just paired at random. Tell us about your school and we&apos;ll follow up.
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                "Classroom and district-wide rollouts",
                "Teacher dashboards for skill gaps, at a glance",
                "FERPA-conscious data handling",
              ].map((line) => (
                <li key={line} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: LP_TEXT_SOFT }}>
                  <Check size={15} style={{ color: C.ember, flexShrink: 0 }} strokeWidth={2.5} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: "1 1 380px", minWidth: "300px" }}>
            <SchoolInquiryForm />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${LP_BORDER}`, padding: "52px 24px" }}>
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/novalogo.png" alt="Nova" style={{ height: "22px", width: "auto" }} />
            <NovaWordmark style={{ height: "17px", width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
            <a href="#features" className="footer-link" style={{ fontSize: "14px", fontWeight: 500 }}>
              Features
            </a>
            <a href="#how" className="footer-link" style={{ fontSize: "14px", fontWeight: 500 }}>
              How it works
            </a>
            <a href="#schools" className="footer-link" style={{ fontSize: "14px", fontWeight: 500 }}>
              For schools
            </a>
            <Link href="/login" className="footer-link" style={{ fontSize: "14px", fontWeight: 500 }}>
              Log in
            </Link>
          </div>
          <span style={{ fontSize: "13px", color: LP_TEXT_FAINT }}>© 2026 Nova</span>
        </div>
      </div>
    </div>
  );
}
