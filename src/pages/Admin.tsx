import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, MapPin, Mail } from "lucide-react";

const Admin = () => {
  const { toast } = useToast();
  const [newCenter, setNewCenter] = useState({
    name: "",
    address: "",
    phone: "",
    hours: "",
    specialties: "",
    email: ""
  });
  const [globalEmail, setGlobalEmail] = useState("");

  const handleAddCenter = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be connected to Supabase once integrated
    toast({
      title: "Success",
      description: "Repair center added successfully",
    });
    setNewCenter({
      name: "",
      address: "",
      phone: "",
      hours: "",
      specialties: "",
      email: ""
    });
  };

  const handleUpdateGlobalEmail = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be connected to Supabase once integrated
    toast({
      title: "Success",
      description: "Global email updated successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Fixbudi Admin Panel</h1>
          </div>
          <Button onClick={() => window.history.back()} variant="outline">
            Back to App
          </Button>
        </div>

        {/* Global Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Global Email Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateGlobalEmail} className="space-y-4">
              <div>
                <Label htmlFor="globalEmail">Email to receive all diagnosis requests</Label>
                <Input
                  id="globalEmail"
                  type="email"
                  value={globalEmail}
                  onChange={(e) => setGlobalEmail(e.target.value)}
                  placeholder="admin@fixbudi.com"
                  required
                />
              </div>
              <Button type="submit">Update Global Email</Button>
            </form>
          </CardContent>
        </Card>

        {/* Add New Repair Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Repair Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCenter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Center Name</Label>
                  <Input
                    id="name"
                    value={newCenter.name}
                    onChange={(e) => setNewCenter({...newCenter, name: e.target.value})}
                    placeholder="Tech Solutions Hub"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newCenter.phone}
                    onChange={(e) => setNewCenter({...newCenter, phone: e.target.value})}
                    placeholder="+234 xxx xxx xxxx"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Center Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCenter.email}
                    onChange={(e) => setNewCenter({...newCenter, email: e.target.value})}
                    placeholder="center@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hours">Operating Hours</Label>
                  <Input
                    id="hours"
                    value={newCenter.hours}
                    onChange={(e) => setNewCenter({...newCenter, hours: e.target.value})}
                    placeholder="Mon-Sat: 8AM-6PM"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={newCenter.address}
                  onChange={(e) => setNewCenter({...newCenter, address: e.target.value})}
                  placeholder="123 Main Street, Port Harcourt, Rivers State"
                  required
                />
              </div>
              <div>
                <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                <Textarea
                  id="specialties"
                  value={newCenter.specialties}
                  onChange={(e) => setNewCenter({...newCenter, specialties: e.target.value})}
                  placeholder="Smartphones, Laptops, Refrigerators, Washing Machines"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Repair Center
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Centers Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Manage Existing Centers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Center management features will be available once Supabase integration is completed.
            </p>
            <Button variant="outline" disabled>
              View All Centers
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
