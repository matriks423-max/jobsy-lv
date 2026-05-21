import { useEffect } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = "404 — jobsy.lv";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
      <div className="text-center">
        <div className="mb-4 font-display text-8xl font-bold text-coral">
          404
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold text-ink">
          Lapa nav atrasta
        </h1>
        <p className="mb-6 font-body text-ink-muted">
          Meklētā lapa neeksistē vai ir pārvietota.
        </p>
        <Link to="/">
          <Button className="rounded-xl border-2 border-ink bg-coral font-body font-medium text-ink hover:bg-coral-hover">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atpakaļ uz sākumu
          </Button>
        </Link>
      </div>
    </div>
  );
}
