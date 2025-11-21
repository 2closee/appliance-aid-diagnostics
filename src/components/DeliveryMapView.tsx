import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Navigation, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryMapViewProps {
  pickupAddress: string;
  deliveryAddress: string;
  driverLocation?: {
    lat: number;
    lng: number;
  };
  deliveryStatus: string;
}

export const DeliveryMapView = ({ 
  pickupAddress, 
  deliveryAddress, 
  driverLocation,
  deliveryStatus 
}: DeliveryMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const { toast } = useToast();

  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainer.current) return;

      try {
        // Get Mapbox token from edge function
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) throw error;
        if (!data?.token) throw new Error('No Mapbox token received');

        mapboxgl.accessToken = data.token;

        // Geocode addresses
        const pickupCoords = await geocodeAddress(pickupAddress, data.token);
        const deliveryCoords = await geocodeAddress(deliveryAddress, data.token);

        if (!pickupCoords || !deliveryCoords) {
          throw new Error('Failed to geocode addresses');
        }

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: pickupCoords,
          zoom: 12,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Create custom pickup marker element
        const pickupEl = document.createElement('div');
        pickupEl.className = 'custom-marker';
        pickupEl.style.width = '40px';
        pickupEl.style.height = '40px';
        pickupEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzEwYjk4MSIvPjxwYXRoIGQ9Ik0yMCAxMFYzME0xMCAyMEgzMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PC9zdmc+)';
        pickupEl.style.backgroundSize = 'contain';

        pickupMarker.current = new mapboxgl.Marker({ element: pickupEl })
          .setLngLat(pickupCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Pickup Location</strong><br/>${pickupAddress}`))
          .addTo(map.current);

        // Create custom delivery marker element
        const deliveryEl = document.createElement('div');
        deliveryEl.className = 'custom-marker';
        deliveryEl.style.width = '40px';
        deliveryEl.style.height = '40px';
        deliveryEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzNiODJmNiIvPjxwYXRoIGQ9Ik0xNSAyMEwyMCAyNUwyNSAxNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=)';
        deliveryEl.style.backgroundSize = 'contain';

        deliveryMarker.current = new mapboxgl.Marker({ element: deliveryEl })
          .setLngLat(deliveryCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Delivery Location</strong><br/>${deliveryAddress}`))
          .addTo(map.current);

        // Add driver marker if location is available
        if (driverLocation) {
          updateDriverLocation(driverLocation);
        }

        // Fit bounds to show all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(pickupCoords);
        bounds.extend(deliveryCoords);
        if (driverLocation) {
          bounds.extend([driverLocation.lng, driverLocation.lat]);
        }

        map.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });

        // Calculate ETA if driver location is available
        if (driverLocation) {
          const targetCoords = deliveryStatus === 'picked_up' || deliveryStatus === 'in_transit' 
            ? deliveryCoords 
            : pickupCoords;
          await calculateETA([driverLocation.lng, driverLocation.lat], targetCoords, data.token);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: 'Map Error',
          description: 'Failed to load map. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      pickupMarker.current?.remove();
      deliveryMarker.current?.remove();
      driverMarker.current?.remove();
      map.current?.remove();
    };
  }, [pickupAddress, deliveryAddress]);

  // Update driver location when it changes
  useEffect(() => {
    if (driverLocation && map.current) {
      updateDriverLocation(driverLocation);
    }
  }, [driverLocation]);

  const updateDriverLocation = (location: { lat: number; lng: number }) => {
    if (!map.current) return;

    const driverCoords: [number, number] = [location.lng, location.lat];

    // Create or update driver marker
    if (!driverMarker.current) {
      const driverEl = document.createElement('div');
      driverEl.className = 'custom-marker driver-marker';
      driverEl.style.width = '50px';
      driverEl.style.height = '50px';
      driverEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyNSIgZmlsbD0iI2VmNDQ0NCIvPjxwYXRoIGQ9Ik0xNSAyNUgzNU0yNSAxNVYzNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSI1IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)';
      driverEl.style.backgroundSize = 'contain';
      driverEl.style.animation = 'pulse 2s infinite';

      driverMarker.current = new mapboxgl.Marker({ element: driverEl })
        .setLngLat(driverCoords)
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Driver Location</strong>'))
        .addTo(map.current);
    } else {
      driverMarker.current.setLngLat(driverCoords);
    }

    // Recenter map on driver
    map.current.easeTo({ center: driverCoords, duration: 1000 });
  };

  const geocodeAddress = async (address: string, token: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].center as [number, number];
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const calculateETA = async (origin: [number, number], destination: [number, number], token: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?access_token=${token}&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const durationMinutes = Math.round(data.routes[0].duration / 60);
        setEta(`${durationMinutes} min`);

        // Add route line to map
        if (map.current && !map.current.getSource('route')) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: data.routes[0].geometry
            }
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.75
            }
          });
        }
      }
    } catch (error) {
      console.error('ETA calculation error:', error);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="w-full h-[400px] rounded-lg overflow-hidden"
          />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {eta && !loading && (
            <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-border">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                  <p className="text-lg font-bold text-primary">{eta}</p>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className="bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              Pickup
            </div>
            <div className="bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              Delivery
            </div>
            {driverLocation && (
              <div className="bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                Driver
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
