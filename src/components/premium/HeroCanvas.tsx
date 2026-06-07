import { useEffect, useRef, useState } from "react";

/**
 * Single hero WebGL moment: a slow-flowing emerald gradient mesh rendered with ogl.
 * Lazy-loads ogl via dynamic import so it never blocks LCP. Falls back to the
 * existing static CSS gradient when reduced-motion, touch/low-DPR, no-WebGL, or
 * the module fails to load.
 */

const STATIC_GRADIENT =
  "linear-gradient(160deg, #003527 0%, #064e3b 45%, #095c45 100%)";

function StaticFallback() {
  return <div className="absolute inset-0" style={{ background: STATIC_GRADIENT }} />;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isLowPower() {
  if (typeof window === "undefined") return true;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowDpr = (window.devicePixelRatio || 1) < 1.5 && window.innerWidth < 768;
  return coarse || lowDpr;
}

const vertex = /* glsl */ `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Animated flowing mesh: layered value-noise warped over time, mapped into the
// emerald-executive palette with a soft coral ember in one corner.
const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = uv;
    p.x *= aspect;

    float t = uTime * 0.04;
    vec2 par = (uMouse - 0.5) * 0.12;

    vec2 q = vec2(fbm(p + par + vec2(0.0, t)), fbm(p + par + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(
      fbm(p + 1.6 * q + vec2(1.7, 9.2) + 0.15 * t),
      fbm(p + 1.6 * q + vec2(8.3, 2.8) - 0.12 * t)
    );
    float f = fbm(p + 2.0 * r);

    vec3 deep   = vec3(0.000, 0.169, 0.124); // #002c20 darker base for contrast
    vec3 mid    = vec3(0.023, 0.305, 0.231); // #064e3b
    vec3 bright = vec3(0.043, 0.451, 0.333); // #0b7355
    vec3 glow   = vec3(0.067, 0.596, 0.435); // #119870 emerald highlight
    vec3 ember  = vec3(1.000, 0.498, 0.314); // #FF7F50

    vec3 col = mix(deep, mid, smoothstep(0.05, 0.6, f));
    col = mix(col, bright, smoothstep(0.42, 1.0, f + 0.3 * r.x));

    // flowing bright ridge — the visible "mesh" depth
    float ridge = smoothstep(0.60, 0.95, f + 0.25 * q.y);
    col = mix(col, glow, ridge * 0.55);

    // slow drifting soft light — Stripe-style sheen across the surface
    vec2 lp = vec2(0.5 + 0.34 * sin(uTime * 0.12), 0.34 + 0.20 * cos(uTime * 0.16));
    float light = smoothstep(0.62, 0.0, distance(uv * vec2(aspect, 1.0), lp * vec2(aspect, 1.0)));
    col += glow * light * 0.20;

    // coral ember, bottom-left, breathing
    float ember_d = distance(uv, vec2(0.14, 0.18));
    float ember_g = smoothstep(0.50, 0.0, ember_d) * (0.09 + 0.04 * sin(uTime * 0.3));
    col = mix(col, ember, ember_g * 0.6);

    // vignette for depth
    float vig = smoothstep(1.2, 0.2, distance(uv, vec2(0.5)));
    col *= 0.78 + 0.22 * vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || isLowPower()) {
      setFailed(true);
      return;
    }

    let renderer: { gl: WebGLRenderingContext; setSize: (w: number, h: number) => void; render: (o: object) => void } | null = null;
    let raf = 0;
    let disposed = false;
    let resizeHandler: (() => void) | null = null;
    let io: IntersectionObserver | null = null;
    const mouse = { x: 0.5, y: 0.5 };
    const targetMouse = { x: 0.5, y: 0.5 };

    const onPointer = (e: PointerEvent) => {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = 1 - e.clientY / window.innerHeight;
    };

    (async () => {
      try {
        const { Renderer, Program, Mesh, Triangle } = await import("ogl");
        if (disposed || !canvasRef.current) return;

        renderer = new Renderer({
          canvas: canvasRef.current,
          dpr: Math.min(window.devicePixelRatio || 1, 1.5),
          antialias: false,
          alpha: false,
        }) as unknown as typeof renderer;
        const gl = renderer!.gl;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
          vertex,
          fragment,
          uniforms: {
            uTime: { value: 0 },
            uResolution: { value: [1, 1] },
            uMouse: { value: [0.5, 0.5] },
          },
        });
        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
          const parent = canvasRef.current?.parentElement;
          const w = parent?.clientWidth ?? window.innerWidth;
          const h = parent?.clientHeight ?? window.innerHeight;
          renderer!.setSize(w, h);
          program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
        };
        resize();
        resizeHandler = resize;
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointer, { passive: true });

        const start = performance.now();
        let visible = true;
        const loop = () => {
          if (!visible) { raf = 0; return; } // paused offscreen — no wasted GPU
          raf = requestAnimationFrame(loop);
          mouse.x += (targetMouse.x - mouse.x) * 0.05;
          mouse.y += (targetMouse.y - mouse.y) * 0.05;
          program.uniforms.uTime.value = (performance.now() - start) / 1000;
          program.uniforms.uMouse.value = [mouse.x, mouse.y];
          renderer!.render({ scene: mesh });
        };
        loop();

        // Pause the RAF loop when the hero scrolls out of view.
        if (typeof IntersectionObserver !== "undefined" && canvasRef.current) {
          io = new IntersectionObserver(
            (entries) => {
              visible = entries[0].isIntersecting;
              if (visible && !raf && !disposed) raf = requestAnimationFrame(loop);
            },
            { threshold: 0 }
          );
          io.observe(canvasRef.current);
        }
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("pointermove", onPointer);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      const gl = renderer?.gl as WebGLRenderingContext | undefined;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (failed) return <StaticFallback />;

  return (
    <>
      {/* static gradient paints instantly under the canvas; canvas fades over it */}
      <StaticFallback />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </>
  );
}
