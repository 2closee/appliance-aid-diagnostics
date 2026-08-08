import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Bike, Loader2, RefreshCw } from "lucide-react";

interface Rider {
  id: string;
  full_name: string;
  phone: string;
  fleet_type: string;
  kyc_status: string;
  phone_verified_at: string | null;
  is_online: boolean;
  is_available: boolean;
  plate_number: string | null;
  total_trips: number;
  average_rating: number | null;
  created_at: string;
}

interface Trip {
  id: string;
  trip_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  fee: number | null;
  rider_id: string | null;
  assignment_attempts: number;
  created_at: string;
}

const money = (n: number | null) => `₦${Number(n ?? 0).toLocaleString()}`;

const OvapassAdmin = () => {
  const { toast } = useToast();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("riders").select("*").order("created_at", { ascending: false }),
      supabase.from("overpass_trips").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setRiders((r as Rider[]) ?? []);
    setTrips((t as Trip[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setKyc = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("riders").update({ kyc_status: status }).eq("id", id);
    if (error) {
      toast({ title: "Could not update rider", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Rider approved" : "Rider rejected" });
    load();
  };

  const retryAssignment = async (tripId: string) => {
    const { error } = await supabase.functions.invoke("overpass-assign", { body: { trip_id: tripId } });
    if (error) {
      toast({ title: "Could not reassign", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Offer sent to the next available rider" });
    load();
  };

  const pending = riders.filter((r) => r.kyc_status === "pending");
  const onlineCount = riders.filter((r) => r.is_online && r.kyc_status === "approved").length;
  const liveTrips = trips.filter((t) =>
    ["pending", "searching", "accepted", "en_route_to_pickup", "picked_up"].includes(t.status),
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ovapass fleet</h1>
            <p className="text-sm text-muted-foreground">Riders, live trips and dispatch health.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Approved riders", riders.filter((r) => r.kyc_status === "approved").length],
          ["Online now", onlineCount],
          ["Pending verification", pending.length],
          ["Live trips", liveTrips.length],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="riders">
        <TabsList>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>

        <TabsContent value="riders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fleet roster</CardTitle>
              <CardDescription>Approve new riders after checking their documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Fleet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trips</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.phone} {r.plate_number ? `· ${r.plate_number}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="capitalize">{r.fleet_type}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant={
                              r.kyc_status === "approved" ? "default" : r.kyc_status === "rejected" ? "destructive" : "secondary"
                            }
                          >
                            {r.kyc_status}
                          </Badge>
                          {r.is_online && <Badge variant="outline">online</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.total_trips} · {Number(r.average_rating ?? 0).toFixed(1)}★
                      </TableCell>
                      <TableCell className="text-right">
                        {r.kyc_status !== "approved" && (
                          <Button size="sm" className="mr-2" onClick={() => setKyc(r.id, "approved")}>
                            Approve
                          </Button>
                        )}
                        {r.kyc_status !== "rejected" && (
                          <Button size="sm" variant="outline" onClick={() => setKyc(r.id, "rejected")}>
                            Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {riders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No riders have applied yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent trips</CardTitle>
              <CardDescription>Retry dispatch for trips no rider has accepted.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate text-sm">{t.pickup_address}</p>
                        <p className="truncate text-xs text-muted-foreground">→ {t.dropoff_address}</p>
                      </TableCell>
                      <TableCell className="capitalize">{t.trip_type}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {money(t.fee)}
                        {t.distance_km ? (
                          <span className="block text-xs text-muted-foreground">{Number(t.distance_km).toFixed(1)} km</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {["pending", "searching", "no_rider_found"].includes(t.status) && (
                          <Button size="sm" variant="outline" onClick={() => retryAssignment(t.id)}>
                            Find rider
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {trips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No Ovapass trips yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OvapassAdmin;
