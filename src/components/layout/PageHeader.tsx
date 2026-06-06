import type { ReactNode } from "react";

/**
 * Standard page title row — one consistent title/subtitle treatment across pages.
 * Optional `action` renders on the right (e.g. a primary button or view toggle).
 * `align="center"` for marketing-style pages (pricing), default left for app pages.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  align = "left",
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  if (align === "center") {
    return (
      <div className={`mb-8 text-center ${className}`}>
        <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl font-body text-body-md text-on-surface-variant md:text-body-lg">
            {subtitle}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className={`mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center ${className}`}>
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 font-body text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
