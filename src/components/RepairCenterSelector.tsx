import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  MessageCircle,
  Search,
  Navigation,
  Truck
} from "lucide-react";

interface RepairCenter {
  id: number;
  name: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  specialties: string[];
  distance: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface RepairCenterSelectorProps {
  onSelectCenter: (center: RepairCenter) => void;
  onBack: () => void;
}

const RepairCenterSelector = ({ onSelectCenter, onBack }: RepairCenterSelectorProps) => {
  const [searchLocation, setSearchLocation] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState("");

  // Sample repair centers data
  const repairCenters: RepairCenter[] = [
    {
      id: 1,
      name: "TechFix Pro",
      address: "123 Main St, Downtown",
      phone: "+1 (555) 123-4567",
      hours: "Mon-Fri: 9AM-6PM, Sat: 10AM-4PM",
      rating: 4.8,
      specialties: ["TV", "Smartphone", "Monitor"],
      distance: 0.8,
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    {
      id: 2,
      name: "ElectroRepair Center",
      address: "456 Oak Ave, Midtown",
      phone: "+1 (555) 987-6543",
      hours: "Mon-Sat: 8AM-7PM",
      rating: 4.6,
      specialties: ["TV", "Headphones", "Monitor"],
      distance: 1.2,
      coordinates: { lat: 40.7505, lng: -73.9934 }
    },
    {
      id: 3,
      name: "Smart Device Solutions",
      address: "789 Pine St, Uptown",
      phone: "+1 (555) 456-7890",
      hours: "Tue-Sun: 10AM-8PM",
      rating: 4.9,
      specialties: ["Smartphone", "Headphones"],
      distance: 2.1,
      coordinates: { lat: 40.7831, lng: -73.9712 }
    },
    {
      id: 4,
      name: "QuickFix Electronics",
      address: "321 Elm Dr, Southside",
      phone: "+1 (555) 234-5678",
      hours: "Mon-Fri: 8AM-6PM",
      rating: 4.4,
      specialties: ["TV", "Monitor", "Smartphone"],
      distance: 2.8,
      coordinates: { lat: 40.7282, lng: -74.0776 }
    }
  ];

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setLocationError("Unable to get your location. Showing all centers.");
          console.log("Geolocation error:", error);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  // Filter centers based on search location
  const filteredCenters = repairCenters
    .filter(center => 
      searchLocation === "" || 
      center.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
      center.name.toLowerCase().includes(searchLocation.toLowerCase())
    )
    .sort((a, b) => a.distance - b.distance);

  const handleGetDirections = (center: RepairCenter) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(center.address)}`;
    window.open(url, '_blank');
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating) 
                ? 'text-yellow-400 fill-current' 
                : i < rating 
                  ? 'text-yellow-400 fill-current opacity-50'
                  : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-xl lg:text-2xl">Choose a Repair Center</CardTitle>
            <CardDescription className="text-sm lg:text-base">
              Select a repair center near you to start chatting with their experts
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onBack} size="sm">
            Back to Options
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Location */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by location or center name..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-10"
            />
          </div>
          {locationError && (
            <p className="text-sm text-warning flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {locationError}
            </p>
          )}
          {userLocation && (
            <p className="text-sm text-success flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Showing centers near your location
            </p>
          )}
        </div>

        {/* Repair Centers List */}
        <div className="space-y-4">
          {filteredCenters.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No repair centers found matching your search.</p>
            </Card>
          ) : (
            filteredCenters.map((center) => (
              <Card key={center.id} className="hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Center Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold">{center.name}</h3>
                          {renderStarRating(center.rating)}
                        </div>
                        <Badge variant="outline" className="self-start">
                          {center.distance} mi away
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{center.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{center.phone}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{center.hours}</span>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2">
                        {center.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48">
                      <Button
                        onClick={() => onSelectCenter(center)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Start Chat
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGetDirections(center)}
                        className="flex items-center gap-2"
                      >
                        <Navigation className="h-4 w-4" />
                        Directions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 lg:p-6 rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold mb-2">Need a Pickup Instead?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Can't visit a repair center? Schedule a pickup service and we'll come to you.
          </p>
          <Button variant="outline" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Schedule Pickup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepairCenterSelector;