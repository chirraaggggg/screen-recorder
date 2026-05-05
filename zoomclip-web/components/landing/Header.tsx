import Link from "next/link";

export function Header() {
  return (
    <header className="w-full border-b border-cardBorder bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-pill bg-green"
            style={{ boxShadow: "0 0 10px rgba(56,216,111,0.7)" }}
            aria-hidden
          />
          <span className="text-lg font-semibold tracking-tight text-text">
            ZoomClip
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#features" className="hover:text-text">
            Features
          </a>
          <a href="#pricing" className="hover:text-text">
            Pricing
          </a>
        </nav>

        <a
          href="https://chromewebstore.google.com/"
          target="_blank"
          rel="noreferrer"
          className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)] hover:brightness-110 active:brightness-95"
        >
          Get Extension
        </a>
      </div>
    </header>
  );
}
