import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getCityCoords } from "@/lib/lv-cities";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import type { Post, Profile } from "@db/schema";

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

// Forces map to recalculate size (needed when map becomes visible after being hidden)
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    // Small delay ensures the container has its final CSS dimensions
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
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

export default function JobMap({ posts }: JobMapProps) {
  const { locale } = useLocale();

  const mappable = posts.filter(({ post }) => getCityCoords(post.city) !== null);

  return (
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
      {mappable.map(({ post }) => {
        const coords = getCityCoords(post.city)!;
        const category = CATEGORIES.find((c) => c.key === post.category);
        return (
          <Marker key={post.id} position={[coords.lat, coords.lng]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-wide" style={{ color: '#FF7F50' }}>
                  {category ? t(locale, `categories.${category.key}` as never) : post.category}
                </p>
                <p className="mb-2 font-bold leading-snug text-gray-900">{post.title}</p>
                {post.budgetText && (
                  <p className="mb-2 font-mono text-xs text-gray-600">{post.budgetText}</p>
                )}
                <Link
                  to={`/post/${post.id}`}
                  className="inline-block rounded-lg border-2 border-gray-800 px-3 py-1 font-mono text-xs font-medium text-gray-900 transition hover:-translate-y-0.5"
                  style={{ background: '#FF7F50' }}
                >
                  {t(locale, "browse.viewPost")} →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
