import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronUp, Plus } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Mobile "Post a Job" FAB — bottom-left, always visible on mobile */}
      <Link
        to="/create"
        aria-label="Post a job"
        className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-DEFAULT text-white shadow-float transition hover:-translate-y-1 hover:bg-on-primary-fixed-variant md:hidden"
      >
        <Plus className="h-5 w-5" />
      </Link>

      {/* Back to top — bottom-right, visible after scroll */}
      {visible && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-accent-coral text-on-surface shadow-card transition hover:-translate-y-1 hover:bg-accent-coral-hover hover:shadow-float"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
