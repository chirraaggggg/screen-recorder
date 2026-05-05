import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-cardBorder bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-pill bg-green"
            style={{ boxShadow: "0 0 10px rgba(56,216,111,0.7)" }}
            aria-hidden
          />
          <span className="text-sm font-semibold text-text">ZoomClip</span>
        </Link>

        <div className="text-sm text-muted">© {new Date().getFullYear()} ZoomClip</div>
      </div>
    </footer>
  );
}
