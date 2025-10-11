import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Navigation as NavigationIcon,
  Search,
  Star,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

type RepairCenter = {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  specialties: string[];
  distance: number;
  coordinates: { lat: number; lng: number };
};

const RepairCenters = () => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<RepairCenter | null>(null);

  // Sample repair centers data
  const repairCenters: RepairCenter[] = [
    {
      id: "1",
      name: "TechFix Downtown",
      address: "123 Main Street, Downtown, NY 10001",
      phone: "(555) 123-4567",
      hours: "Mon-Fri 9AM-6PM, Sat 10AM-4PM",
      rating: 4.8,
      specialties: ["TVs", "Smartphones", "Laptops"],
      distance: 0.5,
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    {
      id: "2",
      name: "ElectroFix Solutions",
      address: "456 Oak Avenue, Midtown, NY 10018",
      phone: "(555) 987-6543",
      hours: "Mon-Fri 8AM-7PM, Sat 9AM-5PM",
      rating: 4.6,
      specialties: ["TVs", "Audio Equipment", "Gaming Consoles"],
      distance: 1.2,
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    {
      id: "3",
      name: "Quick Repair Hub",
      address: "789 Pine Street, Upper East Side, NY 10075",
      phone: "(555) 456-7890",
      hours: "Mon-Sat 10AM-8PM, Sun 12PM-6PM",
      rating: 4.4,
      specialties: ["Smartphones", "Tablets", "Headphones"],
      distance: 2.1,
      coordinates: { lat: 40.7736, lng: -73.9566 }
    },
    {
      id: "4",
      name: "Premium Tech Services",
      address: "321 Broadway, SoHo, NY 10012",
      phone: "(555) 789-0123",
      hours: "Mon-Fri 9AM-6PM, Sat 10AM-3PM",
      rating: 4.9,
      specialties: ["TVs", "Premium Audio", "Smart Home"],
      distance: 3.5,
      coordinates: { lat: 40.7211, lng: -74.0039 }
    }
  ];

  const handleGetDirections = (center: RepairCenter) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(center.address)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleSchedulePickup = (center: RepairCenter) => {
    navigate('/pickup-request', { state: { selectedCenter: center } });
  };

  const filteredCenters = repairCenters.filter(center => 
    center.name.toLowerCase().includes(searchLocation.toLowerCase()) ||
    center.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
    center.specialties.some(specialty => 
      specialty.toLowerCase().includes(searchLocation.toLowerCase())
    )
  ).sort((a, b) => a.distance - b.distance);

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
            {filteredCenters.map((center) => (
              <Card 
                key={center.id} 
                className={`shadow-medium transition-all hover:shadow-strong ${
                  selectedCenter?.id === center.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedCenter(center)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{center.name}</CardTitle>
                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-medium">{center.rating}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {center.distance} miles away
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">{center.distance} mi</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{center.address}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${center.phone}`} className="text-sm text-primary hover:underline">
                      {center.phone}
                    </a>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{center.hours}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Specialties:</p>
                    <div className="flex flex-wrap gap-2">
                      {center.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
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

          {filteredCenters.length === 0 && (
            <Card className="shadow-medium">
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No repair centers found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or contact us for assistance finding a repair center near you.
                </p>
              </CardContent>
            </Card>
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