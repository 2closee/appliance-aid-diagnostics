import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  general_location: string;
  hours: string;
  specialties: string;
  number_of_staff: number;
  years_of_experience: number;
}

interface RepairCenterSelectorProps {
  onSelectCenter: (center: RepairCenter) => void;
  onBack: () => void;
}

const RepairCenterSelector = ({ onSelectCenter, onBack }: RepairCenterSelectorProps) => {
  const [searchLocation, setSearchLocation] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState("");

  // Fetch repair centers from secure public function
  const { data: repairCenters = [], isLoading } = useQuery({
    queryKey: ["public-repair-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_repair_centers");
      
      if (error) throw error;
      return data || [];
    },
  });

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
      center.general_location.toLowerCase().includes(searchLocation.toLowerCase()) ||
      center.name.toLowerCase().includes(searchLocation.toLowerCase())
    );

  const handleGetDirections = (center: RepairCenter) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name + ' ' + center.general_location)}`;
    window.open(url, '_blank');
  };

  const renderExperienceBadge = (years: number) => {
    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">{years} years experience</span>
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
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredCenters.length === 0 ? (
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
                          {renderExperienceBadge(center.years_of_experience)}
                        </div>
                        <Badge variant="outline" className="self-start">
                          {center.number_of_staff} staff members
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{center.general_location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{center.hours}</span>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2">
                        {center.specialties && center.specialties.split(',').map((specialty) => (
                          <Badge key={specialty.trim()} variant="secondary" className="text-xs">
                            {specialty.trim()}
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
          <h3 className="text-lg font-semibold mb-2">Selected a Center?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Choose a repair center above to schedule your device pickup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepairCenterSelector;