import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import RepairCenterSelector from "@/components/RepairCenterSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, ArrowLeft } from "lucide-react";

interface RepairCenter {
  id: number;
  name: string;
  general_location: string;
  hours: string;
  specialties: string;
  number_of_staff: number;
  years_of_experience: number;
}

const PickupSelection = () => {
  const navigate = useNavigate();
  const [showCenterSelector, setShowCenterSelector] = useState(true);

  const handleSelectCenter = (center: RepairCenter) => {
    // Navigate to pickup request with the selected center
    navigate('/pickup-request', { 
      state: { 
        selectedCenter: center 
      } 
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  if (showCenterSelector) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <RepairCenterSelector 
            onSelectCenter={handleSelectCenter}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Schedule Pickup Service
            </CardTitle>
            <CardDescription>
              Choose a repair center near you to schedule your device pickup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCenterSelector(true)} className="w-full">
              Select Repair Center
            </Button>
            <Button variant="ghost" onClick={handleBack} className="w-full mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PickupSelection;
