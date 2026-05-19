import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

export default function JobMap({ posts }: JobMapProps) {
  const { locale } = useLocale();

  const mappable = posts.filter(({ post }) => getCityCoords(post.city) !== null);

  return (
    <MapContainer
      center={[56.88, 24.6]}
      zoom={7}
      className="h-[380px] w-full rounded-2xl border-2 border-ink md:h-[520px]"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappable.map(({ post }) => {
        const coords = getCityCoords(post.city)!;
        const category = CATEGORIES.find((c) => c.key === post.category);
        return (
          <Marker key={post.id} position={[coords.lat, coords.lng]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                  {category ? t(locale, `categories.${category.key}` as never) : post.category}
                </p>
                <p className="mb-2 font-bold text-gray-900 leading-snug">{post.title}</p>
                <Link
                  to={`/post/${post.id}`}
                  className="inline-block rounded bg-orange-400 px-3 py-1 text-xs font-medium text-white hover:bg-orange-500"
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
