import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="w-full bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-text">Pricing</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-card border border-cardBorder bg-panel p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-text">Free</div>
              <div className="text-sm font-semibold text-muted">$0</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>5 exports/month</li>
              <li>Watermark</li>
              <li>720p</li>
            </ul>
            <Link
              href="/editor"
              className="mt-6 inline-flex w-full items-center justify-center rounded-input bg-accent px-4 py-3 text-sm font-semibold text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)] hover:brightness-110 active:brightness-95"
            >
              Try the Editor
            </Link>
          </div>

          <div className="rounded-card border border-cardBorder bg-panel p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-text">Pro</div>
              <div className="text-sm font-semibold text-muted">$15/month</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>Unlimited exports</li>
              <li>No watermark</li>
              <li>1080p</li>
              <li>Priority processing</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
