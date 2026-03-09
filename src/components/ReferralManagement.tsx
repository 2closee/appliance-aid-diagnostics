import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Users, CheckCircle, Clock, DollarSign } from "lucide-react";

const ReferralManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: centers } = useQuery({
    queryKey: ["referral-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Repair Center")
        .select("id, name")
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rewards } = useQuery({
    queryKey: ["admin-referral-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_referral_rewards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const markRewardPaid = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from("center_referral_rewards")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", rewardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referral-rewards"] });
      toast({ title: "Reward marked as paid" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const getCenterName = (id: number | null) => {
    if (!id) return "—";
    return centers?.find((c) => c.id === id)?.name || `Center #${id}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "registered": return <Badge variant="secondary">Registered</Badge>;
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>;
      case "rewarded": return <Badge className="bg-violet-500/10 text-violet-600 border-violet-200"><Gift className="h-3 w-3 mr-1" />Rewarded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalReferrals = referrals?.length || 0;
  const activeReferrals = referrals?.filter((r) => r.status === "active" || r.status === "rewarded").length || 0;
  const pendingRewards = rewards?.filter((r) => r.status === "pending").length || 0;
  const totalPaidOut = rewards?.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{activeReferrals}</p>
            <p className="text-xs text-muted-foreground">Active Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{pendingRewards}</p>
            <p className="text-xs text-muted-foreground">Pending Rewards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-violet-500" />
            <p className="text-2xl font-bold">₦{totalPaidOut.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Paid Out</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Referrals</CardTitle>
          <CardDescription>Track referral status and manage rewards</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : referrals && referrals.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 font-medium">Referring Center</th>
                      <th className="text-left p-3 font-medium">Referred Business</th>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Reward</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">{getCenterName(ref.referring_center_id)}</td>
                        <td className="p-3">
                          <div>
                            <p>{ref.referred_business_name}</p>
                            <p className="text-xs text-muted-foreground">{ref.referred_email}</p>
                          </div>
                        </td>
                        <td className="p-3"><code className="text-xs bg-muted px-2 py-1 rounded">{ref.referral_code}</code></td>
                        <td className="p-3">{getStatusBadge(ref.status)}</td>
                        <td className="p-3">
                          {ref.reward_amount ? `₦${Number(ref.reward_amount).toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(ref.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No referrals yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Rewards */}
      {rewards && rewards.filter((r) => r.status === "pending").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Rewards</CardTitle>
            <CardDescription>Approve and mark rewards as paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rewards
                .filter((r) => r.status === "pending")
                .map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{getCenterName(reward.center_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {reward.reward_type} — ₦{Number(reward.amount).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => markRewardPaid.mutate(reward.id)}
                      disabled={markRewardPaid.isPending}
                    >
                      Mark as Paid
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralManagement;
