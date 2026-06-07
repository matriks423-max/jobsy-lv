import { useEffect } from "react";

const BASE = "https://jobsy.lv";

type SeoOptions = {
  title: string;
  description: string;
  /** path used for the canonical URL + og:url (query params stripped). Defaults to current path. */
  canonicalPath?: string;
  /** "index, follow" (default) or "noindex, follow" */
  robots?: string;
  ogImage?: string;
  ogType?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string): { el: HTMLMetaElement; created: boolean } {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return { el, created };
}

function upsertLink(rel: string, href: string): { el: HTMLLinkElement; created: boolean } {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  return { el, created };
}

/**
 * Centralized per-page SEO head management: title, description, canonical,
 * Open Graph, and robots. Restores previous values on unmount so client-side
 * navigation between pages stays clean.
 */
export function useSeo({ title, description, canonicalPath, robots = "index, follow", ogImage = `${BASE}/og-image.png`, ogType = "website" }: SeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const path = canonicalPath ?? window.location.pathname;
    const canonicalUrl = `${BASE}${path}`;

    const cleanups: Array<() => void> = [];
    const track = (r: { el: Element; created: boolean }, reset: () => void) => {
      cleanups.push(() => { if (r.created) r.el.remove(); else reset(); });
    };

    const d = upsertMeta("name", "description", description);
    track(d, () => { d.el.content = ""; });
    const rob = upsertMeta("name", "robots", robots);
    track(rob, () => { rob.el.content = "index, follow"; });
    const can = upsertLink("canonical", canonicalUrl);
    track(can, () => { can.el.href = BASE; });

    const og: Array<["property" | "name", string, string]> = [
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:url", canonicalUrl],
      ["property", "og:type", ogType],
      ["property", "og:image", ogImage],
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
      ["name", "twitter:image", ogImage],
    ];
    for (const [attr, key, val] of og) {
      const r = upsertMeta(attr, key, val);
      track(r, () => { r.el.content = ""; });
    }

    return () => {
      document.title = prevTitle;
      cleanups.forEach((fn) => fn());
    };
  }, [title, description, canonicalPath, robots, ogImage, ogType]);
}
