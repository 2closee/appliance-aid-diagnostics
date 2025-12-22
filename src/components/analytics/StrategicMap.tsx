import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Building2, Users, AlertCircle } from "lucide-react";

interface StrategicMapProps {
  dateRange: number;
}

interface LocationData {
  type: 'user' | 'center' | 'application';
  address: string;
  name?: string;
  date: string;
  status?: string;
}

const StrategicMap = ({ dateRange }: StrategicMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['strategic-locations', dateRange],
    queryFn: async (): Promise<LocationData[]> => {
      const startDate = subDays(new Date(), dateRange);
      const results: LocationData[] = [];

      // Get repair jobs (user locations from pickup_address)
      const { data: jobs } = await supabase
        .from('repair_jobs')
        .select('pickup_address, customer_name, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (jobs) {
        jobs.forEach(job => {
          if (job.pickup_address) {
            results.push({
              type: 'user',
              address: job.pickup_address,
              name: job.customer_name,
              date: job.created_at,
            });
          }
        });
      }

      // Get active repair centers
      const { data: centers } = await supabase
        .from('Repair Center')
        .select('address, name, status')
        .eq('status', 'active')
        .is('deleted_at', null);

      if (centers) {
        centers.forEach(center => {
          if (center.address && center.address !== 'Full address') {
            results.push({
              type: 'center',
              address: center.address,
              name: center.name || 'Unnamed Center',
              date: new Date().toISOString(),
              status: center.status,
            });
          }
        });
      }

      // Get pending applications
      const { data: applications } = await supabase
        .from('repair_center_applications')
        .select('address, city, state, business_name, created_at, status')
        .eq('status', 'pending');

      if (applications) {
        applications.forEach(app => {
          const fullAddress = `${app.address}, ${app.city}, ${app.state}`;
          results.push({
            type: 'application',
            address: fullAddress,
            name: app.business_name,
            date: app.created_at,
            status: app.status,
          });
        });
      }

      return results;
    },
  });

  const { data: mapboxToken } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) throw error;
      return data.token;
    },
  });

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [8.6753, 9.0820], // Nigeria center
        zoom: 5.5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('Failed to load map');
      });
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Add markers when locations are loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || !locations) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Geocode and add markers
    const addMarkers = async () => {
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoords = false;

      for (const location of locations.slice(0, 50)) { // Limit to 50 for performance
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location.address)}.json?access_token=${mapboxToken}&country=NG&limit=1`
          );
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;

            // Create marker element
            const el = document.createElement('div');
            el.className = 'strategic-marker';
            el.style.cssText = `
              width: 24px;
              height: 24px;
              border-radius: 50%;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;

            if (location.type === 'user') {
              el.style.backgroundColor = '#3b82f6'; // Blue for users
              el.innerHTML = '👤';
            } else if (location.type === 'center') {
              el.style.backgroundColor = '#22c55e'; // Green for active centers
              el.innerHTML = '🏪';
            } else {
              el.style.backgroundColor = '#f59e0b'; // Orange for pending applications
              el.innerHTML = '📋';
            }

            // Create popup
            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="padding: 8px;">
                <strong>${location.name || 'Unknown'}</strong>
                <br/>
                <span style="font-size: 12px; color: #666;">${location.type === 'user' ? 'Customer' : location.type === 'center' ? 'Repair Center' : 'Pending Application'}</span>
                <br/>
                <span style="font-size: 11px; color: #999;">${location.address.substring(0, 50)}...</span>
              </div>
            `);

            new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .setPopup(popup)
              .addTo(map.current!);

            bounds.extend([lng, lat]);
            hasValidCoords = true;
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }

      if (hasValidCoords && map.current) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    };

    addMarkers();
  }, [locations, mapLoaded, mapboxToken]);

  const userCount = locations?.filter(l => l.type === 'user').length || 0;
  const centerCount = locations?.filter(l => l.type === 'center').length || 0;
  const applicationCount = locations?.filter(l => l.type === 'application').length || 0;

  return (
    <Card className="h-[600px]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Distribution
          </span>
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {userCount} Users
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-success/20 text-success">
              <Building2 className="h-3 w-3" /> {centerCount} Centers
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-warning/20 text-warning">
              <AlertCircle className="h-3 w-3" /> {applicationCount} Pending
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : mapError ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-8 w-8 mr-2" />
            {mapError}
          </div>
        ) : (
          <div ref={mapContainer} className="h-full w-full rounded-b-lg" />
        )}
      </CardContent>
    </Card>
  );
};

export default StrategicMap;
