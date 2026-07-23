import { useEffect, useState } from "react";
import { Truck, Phone, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  appliance_type: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  job_status: string;
  created_at: string;
}

interface Props {
  repairCenterId: number;
}

export const CenterBulkyPickupQueue = ({ repairCenterId }: Props) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("repair_jobs")
      .select("id, appliance_type, customer_name, customer_phone, customer_email, job_status, created_at")
      .eq("repair_center_id", repairCenterId)
      .eq("logistics_category", "bulky")
      .in("job_status", ["requested", "quote_accepted", "pickup_scheduled"])
      .order("created_at", { ascending: false });
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (repairCenterId) load(); }, [repairCenterId]);

  const markPickedUp = async (id: string) => {
    const { error } = await supabase.from("repair_jobs").update({ job_status: "picked_up" }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: "Marked as picked up." }); load(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Bulky Pickup Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bulky items awaiting your logistics. When customers book ACs, TVs, or other bulky
            items, they'll appear here so you can arrange transport.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-medium">{j.appliance_type}</div>
                    <div className="text-xs text-muted-foreground">{j.customer_name}</div>
                  </div>
                  <Badge variant="outline">{j.job_status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${j.customer_phone}`}><Phone className="h-3 w-3 mr-1" /> Call customer</a>
                  </Button>
                  <Button size="sm" onClick={() => markPickedUp(j.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark picked up
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
