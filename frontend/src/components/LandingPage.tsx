import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import {
  IconArrowRight,
  IconBadgeCheck,
  IconGitBranch,
  IconGlobe,
  IconHandshake,
  IconLayers,
  IconSearch,
  IconSparkles,
} from "@/components/icons";
import { STATUS_BG_CLASS, STATUS_LABEL, STATUS_TEXT_CLASS } from "@/lib/claimStatus";
import type { ClaimStatus } from "@/types/api";

const STAGES = ["Intent", "Routing", "Retrieval", "Verification"];
const CLAIM_LEGEND: ClaimStatus[] = ["verified", "weak", "unsupported"];
const SOURCE_APIS = ["Wikipedia", "arXiv", "PubMed", "Semantic Scholar", "NASA"];

const STATS = [
  { value: "5", label: "live external source APIs, not a static demo dataset" },
  { value: "3", label: "levels of disclosure - answer, evidence, full trace" },
  { value: "100%", label: "of claims traced back to a source or flagged" },
];

function Eyebrow() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
      <IconSparkles className="h-3.5 w-3.5" />
      Human-AI Decision Workspace
    </span>
  );
}

function ChromeDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-white/25" />
      <span className="h-2 w-2 rounded-full bg-white/25" />
      <span className="h-2 w-2 rounded-full bg-white/25" />
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg py-6 lg:mx-0">
      <div
        aria-hidden="true"
        className="motion-safe:animate-aurora absolute -top-24 right-0 h-96 w-96 rounded-full bg-emerald-500 opacity-30 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="motion-safe:animate-aurora absolute -bottom-16 left-4 h-72 w-72 rounded-full bg-sky-500 opacity-20 blur-[100px] [animation-delay:-6s]"
      />

      {/* Back card: minimal dark browser chrome for depth. */}
      <div
        aria-hidden="true"
        className="absolute -top-4 right-0 w-64 rotate-[7deg] rounded-2xl border border-white/10 bg-neutral-900/90 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center border-b border-white/10 px-3.5 py-2.5">
          <ChromeDots />
        </div>
        <div className="h-32 bg-gradient-to-br from-neutral-800 to-neutral-950" />
      </div>

      {/* Front card: the decision recap, in the product's own visual language. */}
      <div className="relative w-full max-w-sm rotate-[-3deg] rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600 to-indigo-900 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <ChromeDots />
          <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-white">
            T
          </span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">What this suggests</p>
        <p className="mt-1 text-lg font-semibold leading-snug text-white">
          Move the launch review to Thursday - most reviewers are free and the deck will be ready.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Solidly supported by your calendar and the project doc
        </p>
      </div>

      {/* Third card: claim highlighting, peeking out bottom-right. */}
      <div className="relative -mt-10 ml-auto w-64 rotate-[4deg] rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600 to-teal-800 p-4 shadow-2xl">
        <div className="mb-2">
          <ChromeDots />
        </div>
        <p className="text-xs font-medium text-white/60">Full answer</p>
        <p className="mt-1 text-sm leading-relaxed text-white/90">
          The team has{" "}
          <mark className="rounded bg-white/20 px-0.5 text-white underline decoration-2 underline-offset-2">
            three reviewers available Thursday
          </mark>
          .
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CLAIM_LEGEND.slice(0, 2).map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white"
            >
              {STATUS_LABEL[status]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  className = "",
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`group flex flex-col gap-3 rounded-3xl border border-neutral-700/70 bg-neutral-900 p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-neutral-100">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{body}</p>
      </div>
      {children}
    </div>
  );
}

export function LandingPage({
  onEnterGuest,
  onOpenAuth,
}: {
  onEnterGuest: () => void;
  onOpenAuth: (mode: "login" | "signup") => void;
}) {
  const reduceMotion = useReducedMotion();
  const fadeUp = {
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
  } as const;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="relative overflow-hidden bg-neutral-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-neutral-950"
        />
        <header className="sticky top-4 z-30 mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-neutral-900/70 px-4 py-2.5 shadow-soft backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 text-xs font-bold text-white"
            >
              T
            </span>
            <span className="text-base font-bold tracking-tight text-white">TellMeWhy</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onEnterGuest}
              className="cursor-pointer rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              Continue as guest
            </button>
          </div>
        </header>

        <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex flex-col items-start gap-5 text-left">
            <Eyebrow />
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
              Make better decisions,
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                not just better answers.
              </span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-neutral-400">
              See what to do, how sure to be, and what would change your mind - every claim checked
              against real sources, not hidden behind a spinner.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={onEnterGuest}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-600 px-6 py-3 text-base font-medium text-white shadow-glow transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Enter workspace
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Create an account
              </button>
            </div>
            <p className="text-xs text-neutral-500">No account needed - guest mode has the full experience.</p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.1 }}
            className="lg:justify-self-end"
          >
            <HeroMockup />
          </motion.div>
        </section>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-8 max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">
              Built to be checked, not just believed
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Four ideas that separate a reasoning workspace from a chat window.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(0,1fr)]">
            <FeatureCard
              className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
              icon={<IconSearch className="h-5 w-5" />}
              title="See the reasoning, not just the answer"
              body="Every stage - intent, routing, retrieval, verification - is visible and clickable, not hidden behind a spinner."
            >
              <ul className="mt-2 flex flex-wrap gap-2">
                {STAGES.map((stage, i) => (
                  <li
                    key={stage}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {stage}
                  </li>
                ))}
              </ul>
            </FeatureCard>

            <FeatureCard
              className="sm:col-span-2 lg:col-span-2"
              icon={<IconBadgeCheck className="h-5 w-5" />}
              title="Claims get fact-checked"
              body="Answers are split into claims and checked against real sources. Unsupported statements are flagged, not hidden."
            >
              <div className="mt-1 flex flex-wrap gap-1.5">
                {CLAIM_LEGEND.map((status) => (
                  <span
                    key={status}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BG_CLASS[status]} ${STATUS_TEXT_CLASS[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                ))}
              </div>
            </FeatureCard>

            <FeatureCard
              icon={<IconGlobe className="h-5 w-5" />}
              title="Grounded in real sources"
              body="Live retrieval from real external research databases - not a static demo dataset."
            >
              <p className="mt-1 text-xs text-neutral-400">{SOURCE_APIS.join(" · ")}</p>
            </FeatureCard>

            <FeatureCard
              icon={<IconHandshake className="h-5 w-5" />}
              title="Collaborative, not just automated"
              body="When confidence drops, the system pauses and asks for your help - upload a source and watch it recover."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-800 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 bg-neutral-900 p-8 text-white">
                <span className="font-display text-3xl font-extrabold">{stat.value}</span>
                <span className="text-sm leading-snug text-neutral-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-emerald-800 to-indigo-900 px-8 py-14 text-center shadow-glow sm:px-14">
            <IconLayers
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10"
            />
            <IconGitBranch
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 text-white/10"
            />
            <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
              Ready to see why, not just what?
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-brand-100">
              Ask a real question and watch every stage of the reasoning happen in front of you.
            </p>
            <button
              type="button"
              onClick={onEnterGuest}
              className="relative mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-medium text-brand-700 shadow-soft transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            >
              Enter workspace
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-neutral-500">
        No account needed to try it - guest mode has the full experience.
      </footer>
    </div>
  );
}
