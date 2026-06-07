import { Link } from "react-router";
import { Plus } from "lucide-react";
import { CategoryIcon } from "@/lib/categoryIcons";
import MagneticButton from "@/components/premium/MagneticButton";

/**
 * Composed "be the first" empty state for a cold-start marketplace — turns a
 * bare "no results" into an encouraging prompt to create the first listing.
 */
export default function EmptyState({
  title,
  subtitle,
  ctaLabel,
  ctaTo = "/create",
  categoryKey,
  secondary,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo?: string;
  categoryKey?: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/[0.07]">
        {categoryKey ? (
          <CategoryIcon catKey={categoryKey} size={32} aria-hidden="true" />
        ) : (
          <Plus className="h-8 w-8 text-primary" aria-hidden="true" />
        )}
      </div>
      <h2 className="mb-2 font-headline text-headline-sm font-semibold text-on-surface">{title}</h2>
      <p className="mb-6 font-body text-body-md text-on-surface-variant">{subtitle}</p>
      <MagneticButton strength={0.4}>
        <Link
          to={ctaTo}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent-coral px-6 font-label text-label-md font-bold text-on-surface shadow-lg shadow-accent-coral/25 transition hover:bg-accent-coral-hover active:scale-95"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {ctaLabel}
        </Link>
      </MagneticButton>
      {secondary && <div className="mt-4">{secondary}</div>}
    </div>
  );
}
