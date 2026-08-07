const FEATURES = [
  { icon: "🔬", title: "See the reasoning, not just the answer", body: "Every stage - intent, routing, retrieval, verification - is visible and clickable, not hidden behind a spinner." },
  { icon: "✅", title: "Claims get fact-checked", body: "Answers are split into claims and checked against real sources. Unsupported statements are flagged, not hidden." },
  { icon: "🌐", title: "Grounded in real sources", body: "Live retrieval from Wikipedia, arXiv, PubMed, Semantic Scholar, and NASA - not a static demo dataset." },
  { icon: "🤝", title: "Collaborative, not just automated", body: "When confidence drops, the system pauses and asks you for help - upload a source and watch it recover." },
];

export function LandingPage({
  onEnterGuest,
  onOpenAuth,
}: {
  onEnterGuest: () => void;
  onOpenAuth: (mode: "login" | "signup") => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">TellMeWhy</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenAuth("login")}
            className="rounded-lg border border-neutral-300 px-3.5 py-1.5 text-sm font-medium hover:bg-neutral-100"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onEnterGuest}
            className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Continue as guest
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          An AI reasoning workspace,
          <br />
          <span className="text-neutral-400">not a chatbot.</span>
        </h1>
        <p className="max-w-xl text-lg text-neutral-500">
          See not just the answer, but why you should - or shouldn't - trust it. Every claim
          checked, every source visible, every confidence score explained.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onEnterGuest}
            className="rounded-lg bg-neutral-900 px-6 py-3 text-base font-medium text-white hover:opacity-90"
          >
            Enter workspace
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth("signup")}
            className="rounded-lg border border-neutral-300 px-6 py-3 text-base font-medium hover:bg-neutral-100"
          >
            Create an account
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="text-2xl" aria-hidden="true">
                {f.icon}
              </div>
              <p className="mt-2 text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-neutral-400">
        No account needed to try it - guest mode has the full experience.
      </footer>
    </div>
  );
}
