import { useRef, type ReactNode, type CSSProperties } from "react";

/**
 * 3D tilt toward cursor + glossy sheen highlight that tracks the pointer.
 * Composition wrapper — does not rewrite the child. No-op on touch + reduced-motion.
 */
export default function TiltCard({
  children,
  className,
  style,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled() || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * max * 2;
    const ry = (px - 0.5) * max * 2;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      el.style.setProperty("--sheen-x", `${px * 100}%`);
      el.style.setProperty("--sheen-y", `${py * 100}%`);
      el.style.setProperty("--sheen-o", "1");
    });
  };

  const reset = () => {
    cancelAnimationFrame(frame.current);
    if (!ref.current) return;
    ref.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    ref.current.style.setProperty("--sheen-o", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={className}
      style={{
        transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
        transformStyle: "preserve-3d",
        willChange: "transform",
        position: "relative",
        ...style,
      }}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          opacity: "var(--sheen-o, 0)",
          transition: "opacity 0.4s ease",
          background:
            "radial-gradient(circle at var(--sheen-x,50%) var(--sheen-y,50%), rgba(255,255,255,0.35), transparent 45%)",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
