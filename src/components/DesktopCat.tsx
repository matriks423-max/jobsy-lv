import { useCallback, useEffect, useRef, useState } from "react";
import "./DesktopCat.css";

type CatState = "idle" | "walking" | "running" | "sleeping" | "spooked";

const W = 80; // cat SVG width
const WALK_PX = 1.1;
const RUN_PX = 3.6;

export default function DesktopCat() {
  const [x, setX] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    return Math.round(w * 0.25 + Math.random() * w * 0.5);
  });
  const [state, setState] = useState<CatState>("idle");
  const [flipped, setFlipped] = useState(false);

  const xRef    = useRef(x);
  const stateRef = useRef<CatState>("idle");
  const targetRef = useRef<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = (v: number) =>
    Math.max(W, Math.min((typeof window !== "undefined" ? window.innerWidth : 1200) - W, v));

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const goIdle = useCallback(() => {
    clearTimer();
    setState("idle");
    stateRef.current = "idle";

    timerRef.current = setTimeout(() => {
      if (stateRef.current !== "idle") return;
      const roll = Math.random();

      if (roll < 0.45) {
        const d = Math.random() > 0.5 ? 1 : -1;
        const tx = clamp(xRef.current + d * (100 + Math.random() * 260));
        targetRef.current = tx;
        setFlipped(tx < xRef.current);
        setState("walking");
        stateRef.current = "walking";
      } else if (roll < 0.56) {
        setState("sleeping");
        stateRef.current = "sleeping";
        timerRef.current = setTimeout(goIdle, 7000 + Math.random() * 9000);
      } else {
        // just sit idle a bit longer, recurse
        goIdle();
      }
    }, 1500 + Math.random() * 5500);
  }, [clearTimer, clamp]);

  // RAF movement loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const s = stateRef.current;
      const tx = targetRef.current;
      if ((s === "walking" || s === "running") && tx !== null) {
        const dx = tx - xRef.current;
        const speed = s === "running" ? RUN_PX : WALK_PX;
        if (Math.abs(dx) <= speed + 0.5) {
          xRef.current = tx;
          setX(tx);
          targetRef.current = null;
          goIdle();
        } else {
          xRef.current += Math.sign(dx) * speed;
          setX(Math.round(xRef.current));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [goIdle]);

  // Mouse proximity → scatter
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (s === "spooked" || s === "running") return;
      const catX = xRef.current;
      const catY = window.innerHeight - 34;
      const dist = Math.hypot(e.clientX - catX, e.clientY - catY);
      if (dist < 160) {
        clearTimer();
        const away = clamp(e.clientX < catX ? catX + 280 : catX - 280);
        targetRef.current = away;
        setFlipped(away < catX);
        setState("running");
        stateRef.current = "running";
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [clearTimer, clamp]);

  // Click anywhere → spooked
  useEffect(() => {
    const onClick = () => {
      if (stateRef.current === "sleeping") {
        goIdle();
        return;
      }
      if (stateRef.current === "spooked") return;
      clearTimer();
      setState("spooked");
      stateRef.current = "spooked";
      const away = clamp(
        xRef.current < window.innerWidth / 2 ? xRef.current + 220 : xRef.current - 220
      );
      targetRef.current = away;
      setFlipped(away < xRef.current);

      timerRef.current = setTimeout(() => {
        setState("running");
        stateRef.current = "running";
        timerRef.current = setTimeout(goIdle, 1400);
      }, 480);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [clearTimer, clamp, goIdle]);

  // Start
  useEffect(() => {
    goIdle();
    return clearTimer;
  }, [goIdle, clearTimer]);

  return (
    <div
      className={`desktop-cat desktop-cat--${state}${flipped ? " desktop-cat--flipped" : ""}`}
      style={{ left: x - W / 2 }}
      aria-hidden="true"
      role="presentation"
    >
      <CatSVG />
    </div>
  );
}

function CatSVG() {
  return (
    <svg
      viewBox="0 0 80 68"
      width="80"
      height="68"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Tail (behind body, rotates from attachment) ── */}
      <g className="cat-tail-group">
        <path
          d="M16,46 C4,50 0,35 6,22 C10,14 17,17 15,25"
          fill="none"
          stroke="#F4A261"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* stripe overlay */}
        <path
          d="M16,46 C4,50 0,35 6,22 C10,14 17,17 15,25"
          fill="none"
          stroke="#D4834A"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="5 9"
          opacity="0.45"
        />
      </g>

      {/* ── Body group (bobs) ── */}
      <g className="cat-body-group">
        {/* Body */}
        <ellipse cx="34" cy="47" rx="19" ry="12" fill="#F4A261" />
        {/* Tabby stripes on body */}
        <path d="M26,37 Q28,47 26,58" stroke="#D4834A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M33,36 Q35,47 33,58" stroke="#D4834A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />

        {/* Back legs (rendered before head so they look behind) */}
        <g className="cat-leg cat-leg-bl">
          <rect x="18" y="57" width="7" height="11" rx="3.5" fill="#D4834A" />
        </g>
        <g className="cat-leg cat-leg-br">
          <rect x="26" y="57" width="7" height="11" rx="3.5" fill="#E8953A" />
        </g>

        {/* Back ear */}
        <polygon points="42,20 50,7 58,20" fill="#E8953A" />
        <polygon points="44,20 50,11 56,20" fill="#FFBBA0" />

        {/* Head */}
        <circle cx="57" cy="30" r="17" fill="#F4A261" />

        {/* Head stripes */}
        <path d="M49,15 Q51,23 49,30" stroke="#D4834A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />
        <path d="M54,13 Q56,21 54,28" stroke="#D4834A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />

        {/* Front ear */}
        <polygon points="55,16 63,3 71,16" fill="#F4A261" />
        <polygon points="57,16 63,7 69,16" fill="#FFBBA0" />

        {/* Muzzle */}
        <ellipse cx="64" cy="36" rx="7" ry="6" fill="#FAD9BF" opacity="0.85" />

        {/* Nose */}
        <ellipse cx="67" cy="33" rx="2.5" ry="2" fill="#E08090" />

        {/* Mouth */}
        <path d="M65,35.5 Q67,38 69,35.5" stroke="#C06070" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Eye */}
        <g className="cat-eye">
          <ellipse cx="51" cy="27" rx="5.5" ry="6" fill="#52B788" />
          <ellipse cx="51" cy="27" rx="2.8" ry="4" fill="#1a1a2e" />
          <circle cx="52.5" cy="25.5" r="1.1" fill="white" />
        </g>

        {/* Whiskers right */}
        <line x1="69" y1="33" x2="79" y2="30" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="69" y1="36" x2="79" y2="36" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="69" y1="38.5" x2="79" y2="42" stroke="#9a9a9a" strokeWidth="0.9" />

        {/* Whiskers left */}
        <line x1="62" y1="33" x2="49" y2="30" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="62" y1="36" x2="49" y2="36" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="62" y1="38.5" x2="49" y2="42" stroke="#9a9a9a" strokeWidth="0.9" />

        {/* Front legs (in front of body) */}
        <g className="cat-leg cat-leg-fl">
          <rect x="44" y="57" width="7" height="11" rx="3.5" fill="#E8953A" />
        </g>
        <g className="cat-leg cat-leg-fr">
          <rect x="52" y="57" width="7" height="11" rx="3.5" fill="#F4A261" />
        </g>
      </g>

      {/* ZZZ — outside body group so it floats freely */}
      <text className="cat-zzz cat-zzz-1" x="70" y="14" fontSize="12" fill="#94B4BC" fontWeight="bold" fontFamily="Georgia, serif">z</text>
      <text className="cat-zzz cat-zzz-2" x="76" y="7"  fontSize="9"  fill="#94B4BC" fontWeight="bold" fontFamily="Georgia, serif">z</text>
    </svg>
  );
}
