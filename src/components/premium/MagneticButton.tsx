import { useRef, type ReactNode, type CSSProperties } from "react";

/**
 * Wraps an interactive element; translates it toward the cursor within a radius,
 * springs back on leave. No-op on touch + reduced-motion (pointer:fine gate).
 */
export default function MagneticButton({
  children,
  className,
  style,
  strength = 0.4,
  radius = 90,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  strength?: number;
  radius?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!enabled() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - dist / (radius + rect.width / 2));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (ref.current)
        ref.current.style.transform = `translate(${dx * strength * pull}px, ${dy * strength * pull}px)`;
    });
  };

  const reset = () => {
    cancelAnimationFrame(frame.current);
    if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={className}
      style={{ display: "inline-flex", transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)", willChange: "transform", ...style }}
    >
      {children}
    </span>
  );
}
