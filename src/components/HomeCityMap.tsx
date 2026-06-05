import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize();
    invalidate();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 400);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(invalidate);
      ro.observe(container);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); ro?.disconnect(); };
  }, [map]);
  return null;
}

// Fix Leaflet default icon paths in Vite (idempotent — safe to call in multiple files)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });
import { t } from "@/lib/i18n";
import { CITIES } from "@/lib/categories";
import { getCityCoords } from "@/lib/lv-cities";

export default function HomeCityMap() {
  const { locale } = useLocale();

  return (
    <MapContainer
      bounds={[[55.57, 20.87], [58.19, 28.34]]}
      boundsOptions={{ padding: [16, 16] }}
      className="h-[400px] w-full rounded-2xl border border-outline-variant md:h-[520px]"
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnMount />
      {CITIES.filter((c) => c !== "other").map((cityKey) => {
        const coords = getCityCoords(cityKey);
        if (!coords) return null;
        return (
          <Marker key={cityKey} position={[coords.lat, coords.lng]}>
            <Popup>
              <div className="min-w-[140px] text-center">
                <p className="mb-2 font-label text-label-sm font-bold text-on-surface">
                  {t(locale, `cities.${cityKey}` as never)}
                </p>
                <Link
                  to={`/browse?city=${cityKey}`}
                  className="inline-block rounded-lg bg-accent-coral px-3 py-1 font-label text-label-sm font-medium text-on-surface transition hover:opacity-90"
                >
                  {t(locale, "cityMap.viewPosts")} ?
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
