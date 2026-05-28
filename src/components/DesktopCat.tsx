import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import "./DesktopCat.css";

type CatState =
  | "idle" | "sitting" | "watching" | "walking" | "running" | "zooming"
  | "sleeping" | "spooked" | "grooming" | "stretching" | "happy" | "hunting"
  | "playful";

const W = 80;
const H = 68;
const WALK_PX   = 1.1;
const RUN_PX    = 3.6;
const ZOOM_PX   = 5.2;
const HUNT_PX   = 0.5;

// ── Rich bubble content ──────────────────────────────────────────────────────
const hour = () => new Date().getHours();

function timeGreeting(): string {
  const h = hour();
  if (h >= 5  && h < 9)  return ["good morning~", "rise and shine!", "early bird~"][Math.floor(Math.random()*3)];
  if (h >= 9  && h < 12) return ["busy morning?", "coffee time ☕", "work work work"][Math.floor(Math.random()*3)];
  if (h >= 12 && h < 14) return ["lunch time~", "nom nom nom", "feed me too"][Math.floor(Math.random()*3)];
  if (h >= 14 && h < 18) return ["afternoon nap?", "still going?", "almost done~"][Math.floor(Math.random()*3)];
  if (h >= 18 && h < 22) return ["evening~", "wind down time", "long day?"][Math.floor(Math.random()*3)];
  return ["late night...", "burning midnight oil?", "go to sleep!", "still here?"][Math.floor(Math.random()*4)];
}

const PAGE_BUBBLES: Record<string, string[]> = {
  "/":        ["hiring?", "need a job?", "find your match~", "good jobs here!"],
  "/browse":  ["anything interesting?", "so many options~", "choose wisely!", "ooh this one..."],
  "/create":  ["great idea!", "post it!", "tell them everything~", "details matter!"],
  "/pricing": ["worth it!", "invest in yourself~", "boost = more views!"],
  "/my-posts":["how are they doing?", "any replies yet?", "bump it up!"],
  "/settings":["looking good~", "preferences saved!", "tidy settings~"],
};

const BUBBLES_IDLE  = ["~", "...", "♪", "zz?", "mrrr~", "*yawn*", "hmm...", "la la la~"];
const BUBBLES_HAPPY = ["miau!", "♥", "purr~", "^•ᴗ•^", "yes! ♥", "*purring*", "more pets!"];
const BUBBLES_GROOM = ["purr...", "~♪", "mmmm~", "spick and span", "hygiene~"];
const BUBBLES_WATCH = ["👀", "what's that?", "interesting...", "I see you~", "watching..."];
const BUBBLES_HUNT  = ["👁", "got my eye on it", "*stalking*", "sneaky...", "almost..."];
const BUBBLES_ZOOM  = ["!!", "ZOOMIES", "wheeeee~", "fast cat!"];

export default function DesktopCat() {
  const location = useLocation();
  const [x, setX] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    return Math.round(w * 0.25 + Math.random() * w * 0.5);
  });
  const [state, setState]     = useState<CatState>("idle");
  const [flipped, setFlipped] = useState(false);
  const [bubble, setBubble]   = useState<string | null>(null);

  const xRef      = useRef(x);
  const stateRef  = useRef<CatState>("idle");
  const targetRef = useRef<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const huntTargetRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = useCallback((v: number) =>
    Math.max(W, Math.min((typeof window !== "undefined" ? window.innerWidth : 1200) - W, v)), []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const showBubble = useCallback((text: string, duration = 2400) => {
    setBubble(text);
    if (bubTimerRef.current) clearTimeout(bubTimerRef.current);
    bubTimerRef.current = setTimeout(() => setBubble(null), duration);
  }, []);

  // Page-context bubble — show when route changes
  useEffect(() => {
    const options = PAGE_BUBBLES[location.pathname];
    if (options && Math.random() < 0.6) {
      const delay = 800 + Math.random() * 1200;
      const id = setTimeout(() => {
        if (stateRef.current === "idle" || stateRef.current === "sitting") {
          showBubble(options[Math.floor(Math.random() * options.length)], 2800);
        }
      }, delay);
      return () => clearTimeout(id);
    }
  }, [location.pathname, showBubble]);

  const goIdle = useCallback(() => {
    clearTimer();
    // At night, bias heavily toward sleeping
    const nightBias = hour() >= 23 || hour() < 6;

    // Occasionally greet with time-of-day or idle bubble
    if (Math.random() < 0.18) {
      const delay = 600 + Math.random() * 1200;
      setTimeout(() => {
        if (stateRef.current === "idle" || stateRef.current === "sitting") {
          const msg = Math.random() < 0.3 ? timeGreeting()
            : BUBBLES_IDLE[Math.floor(Math.random() * BUBBLES_IDLE.length)];
          showBubble(msg, 2200);
        }
      }, delay);
    }

    setState("idle");
    stateRef.current = "idle";

    timerRef.current = setTimeout(() => {
      if (stateRef.current !== "idle") return;
      const roll = Math.random();

      if (roll < 0.30) {
        // Walk
        const d   = Math.random() > 0.5 ? 1 : -1;
        const tx  = clamp(xRef.current + d * (100 + Math.random() * 340));
        targetRef.current = tx;
        setFlipped(tx < xRef.current);
        setState("walking");
        stateRef.current = "walking";
        if (Math.random() < 0.3)
          setTimeout(() => {
            if (stateRef.current === "walking")
              showBubble(["~", "♪", "..."][Math.floor(Math.random() * 3)], 1200);
          }, 400 + Math.random() * 500);

      } else if (roll < 0.36) {
        // Zoomies
        const goRight = xRef.current < window.innerWidth / 2;
        const edge1   = clamp(goRight ? window.innerWidth - W * 1.5 : W * 1.5);
        const edge2   = clamp(goRight ? W * 2 : window.innerWidth - W * 2);
        targetRef.current = edge1;
        setFlipped(!goRight);
        setState("zooming");
        stateRef.current = "zooming";
        showBubble(BUBBLES_ZOOM[Math.floor(Math.random() * BUBBLES_ZOOM.length)], 900);
        const zoomBack = () => {
          if (stateRef.current !== "zooming") return;
          targetRef.current = edge2;
          setFlipped(goRight);
          timerRef.current = setTimeout(goIdle, 1600);
        };
        timerRef.current = setTimeout(zoomBack, 1100 + Math.abs(edge1 - xRef.current) / ZOOM_PX * 16);

      } else if (roll < (nightBias ? 0.65 : 0.44)) {
        // Sleep (longer at night)
        setState("sleeping");
        stateRef.current = "sleeping";
        const napLen = nightBias
          ? 12000 + Math.random() * 18000
          : 5000 + Math.random() * 7000;
        timerRef.current = setTimeout(() => {
          setState("stretching");
          stateRef.current = "stretching";
          showBubble("stretch~", 1600);
          timerRef.current = setTimeout(goIdle, 1800);
        }, napLen);

      } else if (roll < 0.58) {
        // Sit and watch
        setState("sitting");
        stateRef.current = "sitting";
        if (Math.random() < 0.5)
          showBubble(BUBBLES_WATCH[Math.floor(Math.random() * BUBBLES_WATCH.length)], 2200);
        timerRef.current = setTimeout(() => {
          if (stateRef.current !== "sitting") return;
          // Sometimes go watching (tilt head)
          if (Math.random() < 0.4) {
            setState("watching");
            stateRef.current = "watching";
            showBubble(BUBBLES_WATCH[Math.floor(Math.random() * BUBBLES_WATCH.length)], 2000);
            timerRef.current = setTimeout(goIdle, 2500 + Math.random() * 1500);
          } else {
            goIdle();
          }
        }, 3000 + Math.random() * 5000);

      } else if (roll < 0.72) {
        // Groom
        setState("grooming");
        stateRef.current = "grooming";
        showBubble(BUBBLES_GROOM[Math.floor(Math.random() * BUBBLES_GROOM.length)], 2400);
        timerRef.current = setTimeout(goIdle, 2500 + Math.random() * 2000);

      } else if (roll < 0.82) {
        // Teleport walk off-edge then reappear other side
        const goingRight = xRef.current > window.innerWidth / 2;
        const edge = goingRight ? window.innerWidth + W : -W;
        const reappear = goingRight ? W + 10 : window.innerWidth - W - 10;
        targetRef.current = edge;
        setFlipped(goingRight);
        setState("walking");
        stateRef.current = "walking";
        const dist = Math.abs(edge - xRef.current);
        timerRef.current = setTimeout(() => {
          xRef.current = reappear;
          setX(reappear);
          targetRef.current = null;
          goIdle();
        }, (dist / WALK_PX) * 16 + 200);

      } else {
        goIdle();
      }
    }, 500 + Math.random() * 2600);
  }, [clearTimer, clamp, showBubble]);

  // RAF movement loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const s  = stateRef.current;
      const tx = targetRef.current;
      if ((s === "walking" || s === "running" || s === "zooming" || s === "hunting") && tx !== null) {
        const speed = s === "zooming" ? ZOOM_PX : s === "running" ? RUN_PX : s === "hunting" ? HUNT_PX : WALK_PX;
        const dx = tx - xRef.current;
        if (Math.abs(dx) <= speed + 0.5) {
          xRef.current = tx;
          setX(tx);
          targetRef.current = null;
          if (s !== "hunting") goIdle();
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

  // Mouse proximity — scatter OR hunt OR play
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (s === "spooked" || s === "running" || s === "zooming") return;

      const catX = xRef.current;
      const catY = window.innerHeight - 34;
      const dist = Math.hypot(e.clientX - catX, e.clientY - catY);

      // If already playing, watch for mouse to move away
      if (s === "playful") {
        if (dist > 200) {
          if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
          clearTimer();
          goIdle();
        }
        return;
      }

      // Detect mouse hovering directly over the cat sprite
      const catLeft = xRef.current - W / 2;
      const onCat = e.clientX >= catLeft && e.clientX <= catLeft + W
                 && e.clientY >= window.innerHeight - H && e.clientY <= window.innerHeight;

      if (onCat) {
        // After 900 ms of hover, roll over and play
        if (!hoverTimerRef.current && (s === "idle" || s === "sitting" || s === "watching" || s === "grooming")) {
          hoverTimerRef.current = setTimeout(() => {
            hoverTimerRef.current = null;
            const cur = stateRef.current;
            if (cur === "idle" || cur === "sitting" || cur === "watching" || cur === "grooming") {
              clearTimer();
              setState("playful");
              stateRef.current = "playful";
              showBubble(["bat bat~ ♥", "play! ♥", "hehe~", "*pawing*"][Math.floor(Math.random() * 4)], 2400);
              timerRef.current = setTimeout(goIdle, 4000 + Math.random() * 2000);
            }
          }, 900);
        }
        return; // don't scatter while hovering to trigger play
      }

      // Mouse left cat — cancel hover timer
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }

      // Very close → scatter
      if (dist < 120) {
        if (s === "sleeping") {
          clearTimer();
          setState("stretching");
          stateRef.current = "stretching";
          showBubble("!", 700);
          timerRef.current = setTimeout(goIdle, 1600);
          return;
        }
        clearTimer();
        const away = clamp(e.clientX < catX ? catX + 260 : catX - 260);
        targetRef.current = away;
        setFlipped(away < catX);
        setState("running");
        stateRef.current = "running";
        return;
      }

      // Mid-range while sitting → start hunting
      if (dist < 340 && dist > 120 && (s === "sitting" || s === "idle") && Math.random() < 0.008) {
        clearTimer();
        huntTargetRef.current = clamp(e.clientX);
        targetRef.current = clamp(e.clientX);
        setFlipped(e.clientX < catX);
        setState("hunting");
        stateRef.current = "hunting";
        showBubble(BUBBLES_HUNT[Math.floor(Math.random() * BUBBLES_HUNT.length)], 1600);
        timerRef.current = setTimeout(() => {
          if (stateRef.current === "hunting") {
            showBubble("pounce! ~", 1200);
            goIdle();
          }
        }, 3500 + Math.random() * 2000);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    };
  }, [clearTimer, clamp, goIdle, showBubble]);

  // Touch proximity → scatter
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (s === "spooked" || s === "running") return;
      const touch = e.touches[0];
      const dist  = Math.hypot(touch.clientX - xRef.current, touch.clientY - (window.innerHeight - 34));
      if (dist < 140) {
        clearTimer();
        const away = clamp(touch.clientX < xRef.current ? xRef.current + 260 : xRef.current - 260);
        targetRef.current = away;
        setFlipped(away < xRef.current);
        setState("running");
        stateRef.current = "running";
      }
    };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => window.removeEventListener("touchmove", onTouchMove);
  }, [clearTimer, clamp]);

  // Scroll detection — fast scroll → cat notices
  useEffect(() => {
    const onScroll = () => {
      const s = stateRef.current;
      const dy = Math.abs(window.scrollY - lastScrollY.current);
      lastScrollY.current = window.scrollY;

      if (dy > 80 && (s === "sleeping" || s === "sitting" || s === "idle") && Math.random() < 0.25) {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
          if (stateRef.current === "sleeping") {
            clearTimer();
            setState("stretching");
            stateRef.current = "stretching";
            showBubble("wha?!", 1000);
            timerRef.current = setTimeout(goIdle, 1800);
          } else if (stateRef.current === "idle" || stateRef.current === "sitting") {
            setState("watching");
            stateRef.current = "watching";
            showBubble(BUBBLES_WATCH[Math.floor(Math.random() * BUBBLES_WATCH.length)], 1800);
            clearTimer();
            timerRef.current = setTimeout(goIdle, 2500);
          }
        }, 400);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [clearTimer, goIdle, showBubble]);

  // Keyboard typing → cat reacts occasionally
  useEffect(() => {
    let keyCount = 0;
    let keyTimer: ReturnType<typeof setTimeout> | null = null;
    const onKey = () => {
      keyCount++;
      if (keyTimer) clearTimeout(keyTimer);
      keyTimer = setTimeout(() => { keyCount = 0; }, 3000);

      if (keyCount === 5 && Math.random() < 0.5) {
        const s = stateRef.current;
        if (s === "idle" || s === "sitting") {
          showBubble(["typing away~", "busy busy!", "writer~", "clack clack"][Math.floor(Math.random() * 4)], 1800);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (keyTimer) clearTimeout(keyTimer); };
  }, [showBubble]);

  // Click/tap interaction
  useEffect(() => {
    const handleInteract = (clientX: number, clientY: number) => {
      const s = stateRef.current;
      if (s === "sleeping") {
        clearTimer();
        setState("stretching");
        stateRef.current = "stretching";
        showBubble("!", 900);
        timerRef.current = setTimeout(goIdle, 1800);
        return;
      }
      if (s === "spooked" || s === "happy") return;

      const catLeft = xRef.current - W / 2;
      const catTop  = window.innerHeight - H;
      const onCat   = clientX >= catLeft && clientX <= catLeft + W &&
                      clientY >= catTop  && clientY <= window.innerHeight;

      clearTimer();
      if (onCat) {
        setState("happy");
        stateRef.current = "happy";
        showBubble(BUBBLES_HAPPY[Math.floor(Math.random() * BUBBLES_HAPPY.length)], 1800);
        timerRef.current = setTimeout(goIdle, 1200);
      } else {
        setState("spooked");
        stateRef.current = "spooked";
        showBubble("!!", 600);
        const away = clamp(xRef.current < window.innerWidth / 2 ? xRef.current + 220 : xRef.current - 220);
        targetRef.current = away;
        setFlipped(away < xRef.current);
        timerRef.current = setTimeout(() => {
          setState("running");
          stateRef.current = "running";
          timerRef.current = setTimeout(goIdle, 1400);
        }, 480);
      }
    };

    const onClick      = (e: MouseEvent) => handleInteract(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; handleInteract(t.clientX, t.clientY); };
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, [clearTimer, clamp, goIdle, showBubble]);

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
      {bubble && <div className="cat-bubble">{bubble}</div>}
      <CatSVG />
    </div>
  );
}

function CatSVG() {
  return (
    <svg viewBox="0 0 80 68" width="80" height="68" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <g className="cat-tail-group">
        <path d="M16,46 C4,50 0,35 6,22 C10,14 17,17 15,25" fill="none" stroke="#F4A261" strokeWidth="7" strokeLinecap="round" />
        <path d="M16,46 C4,50 0,35 6,22 C10,14 17,17 15,25" fill="none" stroke="#D4834A" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="5 9" opacity="0.45" />
      </g>
      {/* Body */}
      <g className="cat-body-group">
        <ellipse cx="34" cy="47" rx="19" ry="12" fill="#F4A261" />
        <path d="M26,37 Q28,47 26,58" stroke="#D4834A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M33,36 Q35,47 33,58" stroke="#D4834A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        <g className="cat-leg cat-leg-bl"><rect x="18" y="57" width="7" height="11" rx="3.5" fill="#D4834A" /></g>
        <g className="cat-leg cat-leg-br"><rect x="26" y="57" width="7" height="11" rx="3.5" fill="#E8953A" /></g>
        <polygon points="42,20 50,7 58,20" fill="#E8953A" />
        <polygon points="44,20 50,11 56,20" fill="#FFBBA0" />
        <circle cx="57" cy="30" r="17" fill="#F4A261" />
        <path d="M49,15 Q51,23 49,30" stroke="#D4834A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />
        <path d="M54,13 Q56,21 54,28" stroke="#D4834A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />
        <polygon points="55,16 63,3 71,16" fill="#F4A261" />
        <polygon points="57,16 63,7 69,16" fill="#FFBBA0" />
        <ellipse cx="64" cy="36" rx="7" ry="6" fill="#FAD9BF" opacity="0.85" />
        <ellipse cx="67" cy="33" rx="2.5" ry="2" fill="#E08090" />
        <path d="M65,35.5 Q67,38 69,35.5" stroke="#C06070" strokeWidth="1" fill="none" strokeLinecap="round" />
        <g className="cat-eye">
          <ellipse cx="51" cy="27" rx="5.5" ry="6" fill="#52B788" />
          <ellipse cx="51" cy="27" rx="2.8" ry="4" fill="#1a1a2e" />
          <circle cx="52.5" cy="25.5" r="1.1" fill="white" />
        </g>
        <line x1="69" y1="33" x2="79" y2="30" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="69" y1="36" x2="79" y2="36" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="69" y1="38.5" x2="79" y2="42" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="62" y1="33" x2="49" y2="30" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="62" y1="36" x2="49" y2="36" stroke="#9a9a9a" strokeWidth="0.9" />
        <line x1="62" y1="38.5" x2="49" y2="42" stroke="#9a9a9a" strokeWidth="0.9" />
        <g className="cat-leg cat-leg-fl"><rect x="44" y="57" width="7" height="11" rx="3.5" fill="#E8953A" /></g>
        <g className="cat-leg cat-leg-fr"><rect x="52" y="57" width="7" height="11" rx="3.5" fill="#F4A261" /></g>
      </g>
      {/* ZZZ */}
      <text className="cat-zzz cat-zzz-1" x="70" y="14" fontSize="12" fill="#94B4BC" fontWeight="bold" fontFamily="Georgia, serif">z</text>
      <text className="cat-zzz cat-zzz-2" x="76" y="7"  fontSize="9"  fill="#94B4BC" fontWeight="bold" fontFamily="Georgia, serif">z</text>
    </svg>
  );
}
