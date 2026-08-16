import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed, Navigation } from "lucide-react";
import { useMapboxToken } from "@/hooks/useMapboxToken";

export interface MapPoint {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  label: string;
}

interface LiveTripMapProps {
  /** Live rider position, if known. */
  riderPosition?: { lat: number; lng: number } | null;
  origin: MapPoint;
  destination: MapPoint;
  /** Which point the rider is heading to right now. */
  target: "origin" | "destination";
  /** `rider` follows the rider tightly; `watcher` keeps everything in view. */
  mode?: "rider" | "watcher";
  height?: number;
  className?: string;
}

const marker = (color: string, size = 34) => {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  return el;
};

/** Shared Mapbox map for Ovapass trips: pickup, drop-off, live rider, route and ETA. */
const LiveTripMap = ({
  riderPosition,
  origin,
  destination,
  target,
  mode = "watcher",
  height = 300,
  className,
}: LiveTripMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const originMarker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);
  const riderMarker = useRef<mapboxgl.Marker | null>(null);
  const userMoved = useRef(false);

  const { token, isLoading: tokenLoading } = useMapboxToken();
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState<{
    origin?: [number, number];
    destination?: [number, number];
  }>({});
  const [eta, setEta] = useState<string | null>(null);
  const [remainingKm, setRemainingKm] = useState<number | null>(null);
  const [offCentre, setOffCentre] = useState(false);

  const targetPoint = target === "origin" ? origin : destination;

  const navUrl = useMemo(() => {
    const dest =
      targetPoint.lat && targetPoint.lng
        ? `${targetPoint.lat},${targetPoint.lng}`
        : targetPoint.address ?? "";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }, [targetPoint]);

  // Resolve coordinates (stored first, geocode as fallback)
  useEffect(() => {
    if (!token) return;
    let active = true;

    const geocode = async (address?: string | null): Promise<[number, number] | undefined> => {
      if (!address) return undefined;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${token}`,
        );
        const json = await res.json();
        return json?.features?.[0]?.center as [number, number] | undefined;
      } catch {
        return undefined;
      }
    };

    (async () => {
      const o: [number, number] | undefined =
        origin.lat != null && origin.lng != null
          ? [Number(origin.lng), Number(origin.lat)]
          : await geocode(origin.address);
      const d: [number, number] | undefined =
        destination.lat != null && destination.lng != null
          ? [Number(destination.lng), Number(destination.lat)]
          : await geocode(destination.address);
      if (active) setCoords({ origin: o, destination: d });
    })();

    return () => {
      active = false;
    };
  }, [token, origin.lat, origin.lng, origin.address, destination.lat, destination.lng, destination.address]);

  // Init map
  useEffect(() => {
    if (!token || !container.current || map.current) return;
    const start: [number, number] =
      riderPosition
        ? [riderPosition.lng, riderPosition.lat]
        : coords.origin ?? coords.destination ?? [7.0134, 4.8156];

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: start,
      zoom: 13,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.current.on("load", () => setReady(true));
    map.current.on("dragstart", () => {
      userMoved.current = true;
      setOffCentre(true);
    });

    return () => {
      originMarker.current?.remove();
      destMarker.current?.remove();
      riderMarker.current?.remove();
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pickup / drop-off markers + initial fit
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;

    if (coords.origin) {
      if (!originMarker.current) {
        originMarker.current = new mapboxgl.Marker({ element: marker("hsl(142 71% 45%)") })
          .setLngLat(coords.origin)
          .setPopup(new mapboxgl.Popup().setText(origin.label))
          .addTo(m);
      } else {
        originMarker.current.setLngLat(coords.origin);
      }
    }
    if (coords.destination) {
      if (!destMarker.current) {
        destMarker.current = new mapboxgl.Marker({ element: marker("hsl(217 91% 60%)") })
          .setLngLat(coords.destination)
          .setPopup(new mapboxgl.Popup().setText(destination.label))
          .addTo(m);
      } else {
        destMarker.current.setLngLat(coords.destination);
      }
    }

    if (!userMoved.current) {
      const bounds = new mapboxgl.LngLatBounds();
      let count = 0;
      [coords.origin, coords.destination].forEach((c) => {
        if (c) {
          bounds.extend(c);
          count++;
        }
      });
      if (riderPosition) {
        bounds.extend([riderPosition.lng, riderPosition.lat]);
        count++;
      }
      if (count > 1) m.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
      else if (count === 1) m.easeTo({ center: bounds.getCenter(), zoom: 14, duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, coords.origin, coords.destination]);

  // Live rider marker + route/ETA to the current target
  useEffect(() => {
    if (!ready || !map.current || !riderPosition || !token) return;
    const m = map.current;
    const pos: [number, number] = [riderPosition.lng, riderPosition.lat];

    if (!riderMarker.current) {
      riderMarker.current = new mapboxgl.Marker({ element: marker("hsl(0 84% 60%)", 26) })
        .setLngLat(pos)
        .setPopup(new mapboxgl.Popup().setText("Rider"))
        .addTo(m);
    } else {
      riderMarker.current.setLngLat(pos);
    }

    if (mode === "rider" && !userMoved.current) {
      m.easeTo({ center: pos, duration: 800 });
    }

    const targetCoords = target === "origin" ? coords.origin : coords.destination;
    if (!targetCoords) return;

    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pos[0]},${pos[1]};${targetCoords[0]},${targetCoords[1]}?geometries=geojson&overview=full&access_token=${token}`,
        );
        const json = await res.json();
        const route = json?.routes?.[0];
        if (!active || !route || !map.current) return;

        setEta(`${Math.max(1, Math.round(route.duration / 60))} min`);
        setRemainingKm(route.distance / 1000);

        const data = { type: "Feature", properties: {}, geometry: route.geometry } as const;
        const src = map.current.getSource("live-route") as mapboxgl.GeoJSONSource | undefined;
        if (src) {
          src.setData(data as never);
        } else {
          map.current.addSource("live-route", { type: "geojson", data: data as never });
          map.current.addLayer({
            id: "live-route",
            type: "line",
            source: "live-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "hsl(217 91% 60%)", "line-width": 4, "line-opacity": 0.8 },
          });
        }
      } catch {
        /* route unavailable — map still shows positions */
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, riderPosition?.lat, riderPosition?.lng, target, coords.origin, coords.destination, token, mode]);

  const recentre = () => {
    userMoved.current = false;
    setOffCentre(false);
    if (!map.current) return;
    if (riderPosition) map.current.easeTo({ center: [riderPosition.lng, riderPosition.lat], zoom: 14 });
  };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div ref={container} style={{ height }} className="w-full" />

        {(tokenLoading || !ready) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {eta && (
          <div className="absolute left-3 top-3 rounded-lg border border-border bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              {target === "origin" ? "To pickup" : "To destination"}
            </p>
            <p className="text-base font-bold text-primary">
              {eta}
              {remainingKm != null ? ` · ${remainingKm.toFixed(1)} km` : ""}
            </p>
          </div>
        )}

        {offCentre && riderPosition && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 left-3 shadow-sm"
            onClick={recentre}
          >
            <LocateFixed className="mr-2 h-4 w-4" /> Recentre
          </Button>
        )}
      </div>

      {mode === "rider" && (
        <Button variant="outline" className="mt-2 w-full" asChild>
          <a href={navUrl} target="_blank" rel="noreferrer">
            <Navigation className="mr-2 h-4 w-4" /> Turn-by-turn directions
          </a>
        </Button>
      )}
    </div>
  );
};

export default LiveTripMap;
