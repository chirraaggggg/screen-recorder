export function Features() {
  return (
    <section id="features" className="w-full bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-text">Features</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-card border border-cardBorder bg-panel p-6">
            <div className="text-base font-semibold text-text">Auto-zoom on click</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Smooth camera moves that zoom exactly where you clicked.
            </p>
          </div>
          <div className="rounded-card border border-cardBorder bg-panel p-6">
            <div className="text-base font-semibold text-text">Works on any OS</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Chrome extension workflow — no desktop app required.
            </p>
          </div>
          <div className="rounded-card border border-cardBorder bg-panel p-6">
            <div className="text-base font-semibold text-text">Free forever</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Process video in your browser — no server costs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
