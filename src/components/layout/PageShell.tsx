import type { ReactNode } from "react";

const WIDTHS = {
  narrow: "max-w-2xl", // forms (settings, create)
  prose: "max-w-3xl", // text/content pages (terms, privacy, profile)
  app: "max-w-4xl", // app lists (my posts)
  wide: "max-w-5xl", // marketing (pricing)
  default: "max-w-container-max-width", // full app width (browse, category)
} as const;

/**
 * Standard page wrapper — one consistent background, container width, and
 * vertical rhythm for every routed page. Pick `width` to match the page's
 * content density; everything else stays identical site-wide.
 */
export default function PageShell({
  children,
  className = "",
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
}) {
  return (
    <div className="min-h-screen bg-surface-off-white">
      <div className={`mx-auto w-full ${WIDTHS[width]} px-margin-mobile py-10 md:px-margin-desktop md:py-14 ${className}`}>
        {children}
      </div>
    </div>
  );
}
