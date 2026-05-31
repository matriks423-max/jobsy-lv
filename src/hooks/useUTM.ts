import { useEffect } from "react";
import { useLocation } from "react-router";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export function useUTM(): void {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasUtm = UTM_KEYS.some((k) => params.has(k));
    if (!hasUtm) return;
    UTM_KEYS.forEach((k) => {
      const val = params.get(k);
      if (val) sessionStorage.setItem(k, val);
    });
  }, [location.search]);
}

export function getStoredUTM(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  return {
    utm_source: sessionStorage.getItem("utm_source") ?? undefined,
    utm_medium: sessionStorage.getItem("utm_medium") ?? undefined,
    utm_campaign: sessionStorage.getItem("utm_campaign") ?? undefined,
  };
}

export function clearStoredUTM(): void {
  UTM_KEYS.forEach((k) => sessionStorage.removeItem(k));
}
