import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Copy, Check, Users, Share2 } from "lucide-react";

interface Props {
  repairCenterId: number;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "FBR-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const RepairCenterReferralCard = ({ repairCenterId }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referredEmail, setReferredEmail] = useState("");
  const [referredName, setReferredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: referrals, refetch } = useQuery({
    queryKey: ["my-referrals", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_referrals")
        .select("*")
        .eq("referring_center_id", repairCenterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!repairCenterId,
  });

  const { data: rewards } = useQuery({
    queryKey: ["my-referral-rewards", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_referral_rewards")
        .select("*")
        .eq("center_id", repairCenterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!repairCenterId,
  });

  const handleCreateReferral = async () => {
    if (!referredEmail.trim() || !referredName.trim()) {
      toast({ title: "Error", description: "Please fill in the business name and email", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const code = generateReferralCode();
      const { error } = await supabase.from("center_referrals").insert({
        referring_center_id: repairCenterId,
        referred_email: referredEmail.trim(),
        referred_business_name: referredName.trim(),
        referral_code: code,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Referral Created!", description: `Referral code: ${code}` });
      setReferredEmail("");
      setReferredName("");
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReferralLink = (code: string) =>
    `${window.location.origin}/repair-center-application?ref=${code}`;

  const copyReferralLink = (code: string) => {
    navigator.clipboard.writeText(getReferralLink(code));
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = (code: string) => {
    const link = getReferralLink(code);
    const text = `Join FixBudi and grow your repair business! Apply here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareOnFacebook = (code: string) => {
    const link = getReferralLink(code);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
  };

  const shareOnInstagram = (code: string) => {
    // Instagram doesn't support direct URL sharing — copy link and prompt user
    navigator.clipboard.writeText(getReferralLink(code));
    toast({
      title: "Link copied!",
      description: "Paste it in your Instagram bio or story. Instagram doesn't support direct link sharing.",
    });
  };

  const totalEarned = rewards?.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer a Repair Center
        </CardTitle>
        <CardDescription>
          Earn rewards when you refer other repair centers to FixBudi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{referrals?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{referrals?.filter(r => r.status === "active" || r.status === "rewarded").length || 0}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">₦{totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Create Referral */}
        <div className="space-y-2 border-t pt-4">
          <Input
            placeholder="Business name"
            value={referredName}
            onChange={(e) => setReferredName(e.target.value)}
          />
          <Input
            placeholder="Business email"
            type="email"
            value={referredEmail}
            onChange={(e) => setReferredEmail(e.target.value)}
          />
          <Button onClick={handleCreateReferral} disabled={isSubmitting} className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Create Referral
          </Button>
        </div>

        {/* Referral History */}
        {referrals && referrals.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">Your Referrals</h4>
            {referrals.slice(0, 5).map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                <div>
                  <p className="font-medium">{ref.referred_business_name}</p>
                  <Badge variant="outline" className="text-xs mt-1">{ref.status}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyReferralLink(ref.referral_code)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepairCenterReferralCard;
