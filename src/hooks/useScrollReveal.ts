import { useEffect, useRef } from "react";

/**
 * Thin GSAP ScrollTrigger wrapper. Lazy-imports gsap so it never blocks LCP.
 * Under reduced-motion it is a no-op — elements stay rendered/visible (the
 * markup must be visible by default; reveal only adds the entrance).
 */

type RevealOpts = {
  /** stagger between matched children, seconds */
  stagger?: number;
  /** translateY start offset, px */
  y?: number;
  /** child selector to stagger; if omitted, animates the container itself */
  selector?: string;
  start?: string;
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  opts: RevealOpts = {}
) {
  const ref = useRef<T>(null);
  const { stagger = 0.08, y = 28, selector, start = "top 82%" } = opts;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !ref.current
    ) {
      return;
    }

    let ctx: { revert: () => void } | null = null;
    let disposed = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const targets = selector
          ? (ref.current!.querySelectorAll(selector) as NodeListOf<Element>)
          : [ref.current!];
        gsap.from(targets, {
          y,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger,
          scrollTrigger: { trigger: ref.current!, start },
        });
      }, ref) as unknown as typeof ctx;
    })();

    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, [stagger, y, selector, start]);

  return ref;
}

/** Parallax: shifts an element by `amount` px across its scroll span. */
export function useParallax<T extends HTMLElement = HTMLDivElement>(amount = 60) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !ref.current
    ) {
      return;
    }

    let ctx: { revert: () => void } | null = null;
    let disposed = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.to(ref.current!, {
          y: amount,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current!,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }, ref) as unknown as typeof ctx;
    })();

    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, [amount]);

  return ref;
}
