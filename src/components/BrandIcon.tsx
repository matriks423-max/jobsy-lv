// Jobsy brand mark — the cat mascot (matches favicon.svg). Single source so the
// navbar, footer, and favicon stay consistent.
export default function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#003527" />
      {/* Ears */}
      <polygon points="8,15 11,5 14,15" fill="#C0C0C0" />
      <polygon points="18,15 21,5 24,15" fill="#C0C0C0" />
      <polygon points="9.2,14 11,7.5 12.8,14" fill="#888888" opacity="0.8" />
      <polygon points="19.2,14 21,7.5 22.8,14" fill="#888888" opacity="0.8" />
      {/* Face */}
      <circle cx="16" cy="20" r="9.5" fill="#D8D8D8" />
      {/* Eyes (happy arcs) */}
      <path d="M11.5 19.5 Q13 17.5 14.5 19.5" stroke="#003527" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M17.5 19.5 Q19 17.5 20.5 19.5" stroke="#003527" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <ellipse cx="16" cy="22" rx="1.2" ry="0.9" fill="#ff8a80" />
      {/* Whiskers */}
      <line x1="8" y1="22" x2="13" y2="22.5" stroke="#aaaaaa" strokeWidth="0.8" />
      <line x1="19" y1="22.5" x2="24" y2="22" stroke="#aaaaaa" strokeWidth="0.8" />
    </svg>
  );
}
