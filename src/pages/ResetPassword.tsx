import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useLocale } from "@/lib/locale-context";

export default function ResetPassword() {
  const { locale } = useLocale();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "Atjaunot paroli — jobsy.lv";
    return () => { document.title = prev; };
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Parolei jābūt vismaz 8 simboliem"); return; }
    if (password !== confirm) { setError("Paroles nesakrīt"); return; }
    if (!token) { setError("Nederīga saite"); return; }
    resetMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="font-body text-ink-muted">Nederīga atjaunošanas saite.</p>
          <Link to="/login" className="mt-4 inline-block font-body text-sm text-coral hover:underline">
            Atpakaļ uz pieteikšanos
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12" style={{ color: "var(--coral)" }} />
          <h1 className="font-display text-2xl font-bold text-ink">Parole atjaunota!</h1>
          <p className="mt-2 font-body text-ink-muted">Vari pieteikties ar jauno paroli.</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 rounded-xl border-2 border-ink px-6 py-2.5 font-body font-semibold transition-all hover:-translate-y-0.5 hover:[box-shadow:3px_3px_0_var(--ink)]"
            style={{ background: "var(--coral)" }}
          >
            Pieteikties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink">Jaunā parole</h1>
          <p className="mt-2 font-body text-sm text-ink-muted">Ievadi jaunu paroli savam kontam</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-ink bg-white p-6 shadow-[4px_4px_0_var(--ink)]">
          {error && (
            <div className="mb-4 rounded-xl border-2 border-need bg-need/10 px-3 py-2 font-body text-sm text-need">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block font-body text-sm font-medium text-ink">Jaunā parole</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vismaz 8 simboli"
                className="w-full rounded-xl border-2 border-ink bg-cream px-4 py-2.5 pr-10 font-body text-sm outline-none focus:border-coral"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1 block font-body text-sm font-medium text-ink">Apstipriniet paroli</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Atkārtojiet paroli"
              className="w-full rounded-xl border-2 border-ink bg-cream px-4 py-2.5 font-body text-sm outline-none focus:border-coral"
              required
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink py-2.5 font-body font-semibold transition-all hover:-translate-y-0.5 hover:[box-shadow:3px_3px_0_var(--ink)] disabled:opacity-60"
            style={{ background: "var(--coral)" }}
          >
            {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saglabāt paroli"}
          </button>
        </form>

        <p className="mt-4 text-center font-body text-sm text-ink-muted">
          <Link to="/login" className="text-coral hover:underline">
            Atpakaļ uz pieteikšanos
          </Link>
        </p>
      </div>
    </div>
  );
}
