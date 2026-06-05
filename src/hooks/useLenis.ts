import { useEffect } from "react";

/**
 * Initializes Lenis smooth scroll once for the mounting page. Lazy-imports the
 * lib so it never blocks first paint. No-op under prefers-reduced-motion.
 */
export function useLenis() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let disposed = false;

    (async () => {
      const { default: Lenis } = await import("lenis");
      if (disposed) return;
      lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      }) as unknown as typeof lenis;

      const loop = (time: number) => {
        lenis!.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
}
