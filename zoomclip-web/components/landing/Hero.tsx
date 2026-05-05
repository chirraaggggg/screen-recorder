import Link from "next/link";

export function Hero() {
  return (
    <section className="w-full bg-bg">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text md:text-5xl">
            Record. Click. Ship.
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Auto-zoom on every click. Screen Studio quality. Any OS. Free.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)] hover:brightness-110 active:brightness-95"
            >
              Get the Extension
            </a>
            <Link
              href="/editor"
              className="rounded-pill border border-inputBorder bg-transparent px-6 py-3 text-sm font-semibold text-text hover:border-cardBorder"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted">
            No uploads. No desktop app. Just your browser.
          </p>
        </div>

        <div className="rounded-card border border-cardBorder bg-panel p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text">Preview</div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-pill bg-accent"
                style={{ animation: "zoomclipPulseRed 1.2s ease-in-out infinite" }}
                aria-hidden
              />
              <span className="text-xs font-semibold text-muted">REC</span>
            </div>
          </div>

          <div className="mt-4 aspect-video w-full rounded-card border border-cardBorder bg-panel2" />

          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Click timeline</span>
            <span>Auto-zoom</span>
          </div>

          <div className="mt-3 h-8 w-full rounded-input bg-panel2" />
        </div>
      </div>
    </section>
  );
}
