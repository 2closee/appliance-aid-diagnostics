import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Zone {
  id: string;
  zone_name: string;
  city: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  active: boolean;
  provider_priority: string[];
}

export default function LogisticsZones() {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [newZone, setNewZone] = useState({ zone_name: "", city: "Port Harcourt", center_lat: "", center_lng: "", radius_km: "5" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("logistics_service_zones").select("*").order("city").order("zone_name");
    setZones((data as Zone[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("logistics_service_zones").update({ active }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const updatePriority = async (id: string, priority: string[]) => {
    await supabase.from("logistics_service_zones").update({ provider_priority: priority }).eq("id", id);
    load();
  };

  const removeZone = async (id: string) => {
    if (!confirm("Delete this zone?")) return;
    await supabase.from("logistics_service_zones").delete().eq("id", id);
    load();
  };

  const addZone = async () => {
    if (!newZone.zone_name || !newZone.city) return;
    const { error } = await supabase.from("logistics_service_zones").insert({
      zone_name: newZone.zone_name,
      city: newZone.city,
      center_lat: newZone.center_lat ? parseFloat(newZone.center_lat) : null,
      center_lng: newZone.center_lng ? parseFloat(newZone.center_lng) : null,
      radius_km: newZone.radius_km ? parseFloat(newZone.radius_km) : 5,
      provider_priority: ["kwik", "bolt", "sendstack"],
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewZone({ zone_name: "", city: "Port Harcourt", center_lat: "", center_lng: "", radius_km: "5" });
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-5xl py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logistics Service Zones</h1>
          <p className="text-muted-foreground">Geofenced pilot zones. Only jobs originating inside an active zone are auto-dispatched.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Add zone</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2"><Label>Zone name</Label><Input value={newZone.zone_name} onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })} /></div>
            <div><Label>City</Label><Input value={newZone.city} onChange={(e) => setNewZone({ ...newZone, city: e.target.value })} /></div>
            <div><Label>Center lat</Label><Input value={newZone.center_lat} onChange={(e) => setNewZone({ ...newZone, center_lat: e.target.value })} /></div>
            <div><Label>Center lng</Label><Input value={newZone.center_lng} onChange={(e) => setNewZone({ ...newZone, center_lng: e.target.value })} /></div>
            <div className="flex gap-2">
              <div className="flex-1"><Label>Radius km</Label><Input value={newZone.radius_km} onChange={(e) => setNewZone({ ...newZone, radius_km: e.target.value })} /></div>
              <Button onClick={addZone} className="mb-0.5"><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {zones.map((z) => (
              <Card key={z.id}>
                <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{z.zone_name}</div>
                    <div className="text-xs text-muted-foreground">{z.city} · {z.center_lat}, {z.center_lng} · {z.radius_km} km</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Priority:</span>
                    <Input
                      className="w-64"
                      value={z.provider_priority.join(",")}
                      onChange={(e) => setZones((prev) => prev.map((x) => x.id === z.id ? { ...x, provider_priority: e.target.value.split(",").map((s) => s.trim()) } : x))}
                      onBlur={() => updatePriority(z.id, z.provider_priority)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={z.active} onCheckedChange={(v) => toggleActive(z.id, v)} />
                    <span className="text-sm">{z.active ? "Active" : "Inactive"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeZone(z.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
