import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Navigation as NavigationIcon,
  Search,
  ArrowRight,
  Users,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { NoRepairCentersFound } from "@/components/NoRepairCentersFound";

type RepairCenter = {
  id: number;
  name: string;
  general_location: string;
  hours: string;
  specialties: string;
  number_of_staff: number;
  years_of_experience: number;
};

const RepairCenters = () => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<RepairCenter | null>(null);

  const { data: repairCenters, isLoading } = useQuery({
    queryKey: ["public-repair-centers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_repair_centers');
      if (error) throw error;
      return data as RepairCenter[];
    }
  });

  const handleGetDirections = (center: RepairCenter) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(center.general_location)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleSchedulePickup = (center: RepairCenter) => {
    navigate('/pickup-request', { state: { selectedCenter: center } });
  };

  const filteredCenters = (repairCenters || []).filter(center => 
    center.name.toLowerCase().includes(searchLocation.toLowerCase()) ||
    center.general_location.toLowerCase().includes(searchLocation.toLowerCase()) ||
    center.specialties.toLowerCase().includes(searchLocation.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-primary mr-4" />
              Find Repair Centers
            </h1>
            <p className="text-lg text-muted-foreground">
              Locate the nearest authorized repair center for your appliance
            </p>
          </div>

          {/* Search Section */}
          <Card className="shadow-medium mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Search by Location or Service</CardTitle>
              <CardDescription>
                Enter your location or the type of service you need
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="location">Location or Service Type</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Enter ZIP code, city, or service type..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button className="self-end">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Repair Centers List */}
          <div className="grid md:grid-cols-2 gap-6">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredCenters.map((center) => (
              <Card 
                key={center.id} 
                className={`shadow-medium transition-all hover:shadow-strong ${
                  selectedCenter?.id === center.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedCenter(center)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{center.name}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{center.number_of_staff} staff</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          <span>{center.years_of_experience} years exp</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{center.general_location}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{center.hours}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Specialties:</p>
                    <div className="flex flex-wrap gap-2">
                      {center.specialties.split(',').map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetDirections(center);
                      }}
                      className="flex-1"
                    >
                      <NavigationIcon className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/repair-center-chat', { state: { selectedCenter: center } });
                      }}
                      className="flex-1"
                      variant="secondary"
                    >
                      Chat
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSchedulePickup(center);
                      }}
                      className="flex-1"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Pickup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isLoading && filteredCenters.length === 0 && (
            <NoRepairCentersFound />
          )}

          {/* Call to Action */}
          <Card className="shadow-medium mt-8 bg-gradient-primary">
            <CardContent className="text-center py-8">
              <h3 className="text-2xl font-bold text-primary-foreground mb-4">
                Can't find what you're looking for?
              </h3>
              <p className="text-primary-foreground/90 mb-6">
                Let us help you find the right repair solution for your appliance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" onClick={() => navigate('/pickup-request')}>
                  Schedule Pickup Service
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RepairCenters;