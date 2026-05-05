export function PrivacyNote() {
  return (
    <div className="rounded-card border border-cardBorder bg-panel px-4 py-3">
      <div className="flex items-center gap-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M7 10V8a5 5 0 0110 0v2"
            stroke="#38d86f"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 10h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"
            stroke="#38d86f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-sm font-semibold text-green">
          Your video never leaves your device. All processing happens in your browser.
        </div>
      </div>
    </div>
  );
}
