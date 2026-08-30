import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface Pricing {
  id: string;
  city: string;
  base_fare: number;
  min_fare: number;
  bulky_surcharge: number;
  after_hours_surcharge: number;
  max_search_radius_km: number;
  preferred_radius_km: number;
  offer_timeout_seconds: number;
}

interface VehicleRate {
  id: string;
  city: string;
  vehicle_class: string;
  per_km: number;
  base_fare: number;
  min_fare: number;
  active: boolean;
}

const CLASS_LABELS: Record<string, string> = {
  bike: "Motorbike",
  e_bike: "Electric bike",
  car: "Car",
  suv: "SUV",
  van: "Van",
  truck: "Truck",
};

const CLASS_ORDER = ["bike", "e_bike", "car", "suv", "van", "truck"];

const OvapassPricingAdmin = () => {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [rates, setRates] = useState<VehicleRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("overpass_pricing").select("*").eq("active", true).limit(1).maybeSingle(),
      supabase.from("overpass_vehicle_rates").select("*"),
    ]);
    setPricing((p as unknown as Pricing) ?? null);
    setRates(
      ((r as unknown as VehicleRate[]) ?? []).sort(
        (a, b) => CLASS_ORDER.indexOf(a.vehicle_class) - CLASS_ORDER.indexOf(b.vehicle_class),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchPricing = (patch: Partial<Pricing>) =>
    setPricing((prev) => (prev ? { ...prev, ...patch } : prev));

  const savePricing = async () => {
    if (!pricing) return;
    if (Number(pricing.max_search_radius_km) <= 0 || Number(pricing.preferred_radius_km) <= 0) {
      toast({ title: "Radii must be greater than zero", variant: "destructive" });
      return;
    }
    if (Number(pricing.preferred_radius_km) > Number(pricing.max_search_radius_km)) {
      toast({ title: "The preferred radius cannot exceed the maximum search radius", variant: "destructive" });
      return;
    }
    setSaving("pricing");
    const { error } = await supabase
      .from("overpass_pricing")
      .update({
        base_fare: Number(pricing.base_fare),
        min_fare: Number(pricing.min_fare),
        bulky_surcharge: Number(pricing.bulky_surcharge),
        after_hours_surcharge: Number(pricing.after_hours_surcharge),
        max_search_radius_km: Number(pricing.max_search_radius_km),
        preferred_radius_km: Number(pricing.preferred_radius_km),
        offer_timeout_seconds: Number(pricing.offer_timeout_seconds),
      })
      .eq("id", pricing.id);
    setSaving(null);
    if (error) {
      toast({ title: "Could not save dispatch settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dispatch settings saved" });
    load();
  };

  const patchRate = (id: string, patch: Partial<VehicleRate>) =>
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveRate = async (rate: VehicleRate) => {
    if (Number(rate.per_km) <= 0) {
      toast({ title: "Cost per kilometre must be greater than zero", variant: "destructive" });
      return;
    }
    if (Number(rate.base_fare) < 0 || Number(rate.min_fare) < 0) {
      toast({ title: "Fares cannot be negative", variant: "destructive" });
      return;
    }
    setSaving(rate.id);
    const { error } = await supabase
      .from("overpass_vehicle_rates")
      .update({
        per_km: Number(rate.per_km),
        base_fare: Number(rate.base_fare),
        min_fare: Number(rate.min_fare),
      })
      .eq("id", rate.id);
    setSaving(null);
    if (error) {
      toast({ title: "Could not save rate", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${CLASS_LABELS[rate.vehicle_class] ?? rate.vehicle_class} rate saved` });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispatch reach</CardTitle>
          <CardDescription>
            The closest qualifying rider is always offered a trip first. When nobody is close, the search widens up to the
            maximum radius below — riders beyond it are never offered the trip and the customer keeps seeing “still
            searching”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="max-radius">Maximum search radius (km)</Label>
                  <Input
                    id="max-radius"
                    type="number"
                    min={1}
                    value={pricing.max_search_radius_km}
                    onChange={(e) => patchPricing({ max_search_radius_km: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred-radius">Preferred radius (km, reporting)</Label>
                  <Input
                    id="preferred-radius"
                    type="number"
                    min={1}
                    value={pricing.preferred_radius_km}
                    onChange={(e) => patchPricing({ preferred_radius_km: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-timeout">Offer timeout (seconds)</Label>
                  <Input
                    id="offer-timeout"
                    type="number"
                    min={30}
                    value={pricing.offer_timeout_seconds}
                    onChange={(e) => patchPricing({ offer_timeout_seconds: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="base-fare">Default base fare (₦)</Label>
                  <Input
                    id="base-fare"
                    type="number"
                    min={0}
                    value={pricing.base_fare}
                    onChange={(e) => patchPricing({ base_fare: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-fare">Default minimum fare (₦)</Label>
                  <Input
                    id="min-fare"
                    type="number"
                    min={0}
                    value={pricing.min_fare}
                    onChange={(e) => patchPricing({ min_fare: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulky-surcharge">Bulky surcharge (₦)</Label>
                  <Input
                    id="bulky-surcharge"
                    type="number"
                    min={0}
                    value={pricing.bulky_surcharge}
                    onChange={(e) => patchPricing({ bulky_surcharge: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="after-hours">After-hours surcharge (₦)</Label>
                  <Input
                    id="after-hours"
                    type="number"
                    min={0}
                    value={pricing.after_hours_surcharge}
                    onChange={(e) => patchPricing({ after_hours_surcharge: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={savePricing} disabled={saving === "pricing"}>
                {saving === "pricing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save dispatch settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active pricing configuration found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cost per kilometre by vehicle</CardTitle>
          <CardDescription>
            Each vehicle type carries its own fuel and size costs. Gadget pickups are quoted at the motorbike rate and
            bulky pickups at the van rate, then repriced with the accepting rider’s actual vehicle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Cost per km (₦)</TableHead>
                <TableHead>Base fare (₦)</TableHead>
                <TableHead>Minimum fare (₦)</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{CLASS_LABELS[rate.vehicle_class] ?? rate.vehicle_class}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 w-28"
                      value={rate.per_km}
                      onChange={(e) => patchRate(rate.id, { per_km: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-28"
                      value={rate.base_fare}
                      onChange={(e) => patchRate(rate.id, { base_fare: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-28"
                      value={rate.min_fare}
                      onChange={(e) => patchRate(rate.id, { min_fare: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => saveRate(rate)} disabled={saving === rate.id}>
                      {saving === rate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No vehicle rates configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OvapassPricingAdmin;
