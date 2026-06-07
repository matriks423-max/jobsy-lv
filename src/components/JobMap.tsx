import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getCityCoords } from "@/lib/lv-cities";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import type { Post, Profile } from "@db/schema";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Fix Leaflet's broken default icon paths in Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface JobMapProps {
  posts: Array<{ post: Post; profile?: Profile | null }>;
}

// Forces map to recalculate size when container becomes visible.
// Uses a ResizeObserver so it fires when the container actually gets dimensions,
// plus staggered fallback timeouts for environments without ResizeObserver.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize();

    // Fire immediately in case dimensions are already correct
    invalidate();

    // Staggered timeouts cover CSS transitions and deferred renders on mobile
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 300);
    const t3 = setTimeout(invalidate, 600);

    // ResizeObserver fires whenever the container gets a real size
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => invalidate());
      ro.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

// Auto-fits map bounds whenever posts change
function FitBoundsController({ posts }: JobMapProps) {
  const map = useMap();

  useEffect(() => {
    const coords = posts
      .map(({ post }) => getCityCoords(post.city))
      .filter(Boolean) as Array<{ lat: number; lng: number }>;

    if (coords.length === 0) {
      map.fitBounds([[55.57, 20.87], [58.19, 28.34]], { padding: [16, 16] });
      return;
    }

    if (coords.length === 1) {
      map.setView([coords[0].lat, coords[0].lng], 10);
      return;
    }

    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, posts]);

  return null;
}

// Clustered marker layer — groups nearby/co-located pins (posts share city
// coords, so a city's listings stack on one point) into numbered clusters that
// spiderfy on click. Built imperatively for react-leaflet 5 compatibility.
function ClusteredMarkers({ posts, locale }: JobMapProps & { locale: string }) {
  const map = useMap();
  useEffect(() => {
    const group = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 45,
      iconCreateFunction: (cluster: any) => {
        const n = cluster.getChildCount();
        const size = n < 10 ? 36 : n < 50 ? 44 : 52;
        return L.divIcon({
          html: `<div role="img" aria-label="${n} ${n === 1 ? "sludinājums" : "sludinājumi"}" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:#003527;color:#fff;font:700 13px/1 system-ui;border:3px solid rgba(255,255,255,0.85);box-shadow:0 2px 8px rgba(0,0,0,0.3)">${n}</div>`,
          className: "",
          iconSize: L.point(size, size),
        });
      },
    });

    const viewLabel = t(locale, "browse.viewPost");
    for (const { post } of posts) {
      const coords = getCityCoords(post.city);
      if (!coords) continue;
      const category = CATEGORIES.find((c) => c.key === post.category);
      const catLabel = category ? t(locale, `categories.${category.key}` as never) : post.category;
      const marker = L.marker([coords.lat, coords.lng]);
      marker.bindPopup(
        `<div style="min-width:160px">
          <p style="margin:0 0 2px;font:600 10px/1.2 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.04em;color:#e56a3a">${escHtml(catLabel)}</p>
          <p style="margin:0 0 6px;font-weight:700;line-height:1.3;color:#141b2b">${escHtml(post.title)}</p>
          ${post.budgetText ? `<p style="margin:0 0 6px;font:12px ui-monospace,monospace;color:#404944">${escHtml(post.budgetText)}</p>` : ""}
          <a href="/post/${post.id}" style="display:inline-block;border-radius:8px;background:#FF7F50;padding:4px 12px;font:600 12px system-ui;color:#141b2b;text-decoration:none">${escHtml(viewLabel)} →</a>
        </div>`
      );
      group.addLayer(marker);
    }
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [map, posts, locale]);
  return null;
}

export default function JobMap({ posts }: JobMapProps) {
  const { locale } = useLocale();

  const mappable = posts.filter(({ post }) => getCityCoords(post.city) !== null);

  return (
    <div className="isolate">
    <MapContainer
      center={[56.88, 24.6]}
      zoom={8}
      className="h-[380px] w-full rounded-2xl border border-outline-variant md:h-[520px]"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnMount />
      <FitBoundsController posts={mappable} />
      <ClusteredMarkers posts={mappable} locale={locale} />
    </MapContainer>
    </div>
  );
}
