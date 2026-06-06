import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Check } from "lucide-react";

export type SearchImage = {
  id: string;
  thumb: string;
  url: string;
  alt?: string;
  author?: string;
  authorUrl?: string;
  downloadLocation?: string;
};

const STR = {
  lv: { ph: "Meklē fotoattēlus (piem. santehniķis)…", live: "Fotoattēli no Unsplash", curated: "Ieteiktie fotoattēli", none: "Nekas netika atrasts", by: "Autors" },
  ru: { ph: "Искать фото (напр. сантехник)…", live: "Фото с Unsplash", curated: "Рекомендуемые фото", none: "Ничего не найдено", by: "Автор" },
  en: { ph: "Search photos (e.g. plumber)…", live: "Photos from Unsplash", curated: "Suggested photos", none: "Nothing found", by: "By" },
};

/**
 * Job image picker. Searches Unsplash live (via /api/images/search, key server-side);
 * if the key isn't configured it falls back to the curated category images so the
 * grid always offers options. Selecting a live photo pings Unsplash's download
 * endpoint (API compliance).
 */
export default function ImageSearchPicker({
  initialQuery,
  fallbackImages,
  selectedUrl,
  onSelect,
  locale = "lv",
}: {
  initialQuery: string;
  fallbackImages: string[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  locale?: string;
}) {
  const s = STR[locale as keyof typeof STR] ?? STR.lv;
  const [query, setQuery] = useState(initialQuery);
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const reqId = useRef(0);

  const curated = (): SearchImage[] =>
    fallbackImages.map((url, i) => ({ id: `c${i}`, thumb: url, url }));

  const run = (q: string) => {
    const term = q.trim();
    const id = ++reqId.current;
    setLoading(true);
    fetch(`/api/images/search?q=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((d: { results?: SearchImage[]; unavailable?: boolean }) => {
        if (id !== reqId.current) return; // stale
        if (d.unavailable || !d.results || d.results.length === 0) {
          setImages(curated());
          setIsLive(false);
        } else {
          setImages(d.results);
          setIsLive(true);
        }
      })
      .catch(() => { if (id === reqId.current) { setImages(curated()); setIsLive(false); } })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  };

  // initial load + whenever the suggested category changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(initialQuery); setQuery(initialQuery); }, [JSON.stringify(fallbackImages)]);

  const onInput = (v: string) => {
    setQuery(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => run(v), 450);
  };

  const pick = (img: SearchImage) => {
    onSelect(img.url);
    if (img.downloadLocation) {
      fetch("/api/images/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: img.downloadLocation }),
      }).catch(() => {});
    }
  };

  return (
    <div>
      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => onInput(e.target.value)}
          placeholder={s.ph}
          className="h-11 w-full rounded-xl border-2 border-outline-variant bg-white pl-9 pr-9 font-body text-sm text-on-surface focus:border-primary focus:outline-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-on-surface-variant" />}
      </div>

      <p className="mb-2 font-label text-label-sm text-on-surface-variant">{isLive ? s.live : s.curated}</p>

      {images.length === 0 && !loading ? (
        <p className="py-4 font-body text-sm text-on-surface-variant">{s.none}</p>
      ) : (
        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {images.map((img) => {
            const active = selectedUrl === img.url;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => pick(img)}
                title={img.author ? `${s.by}: ${img.author}` : undefined}
                className={`group relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all ${
                  active ? "border-primary ring-2 ring-primary ring-offset-1" : "border-outline-variant hover:border-outline"
                }`}
              >
                <img src={img.thumb} alt={img.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/30">
                    <Check className="h-6 w-6 text-white drop-shadow" />
                  </span>
                )}
                {isLive && img.author && (
                  <span className="absolute bottom-0 left-0 right-0 truncate bg-black/45 px-1.5 py-0.5 text-left text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {img.author}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {isLive && (
        <p className="mt-2 text-[10px] text-on-surface-variant">
          Photos via <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
        </p>
      )}
    </div>
  );
}
