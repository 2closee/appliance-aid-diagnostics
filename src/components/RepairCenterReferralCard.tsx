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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyReferralLink(ref.referral_code)}
                    title="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => shareOnWhatsApp(ref.referral_code)}
                    title="Share on WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => shareOnFacebook(ref.referral_code)}
                    title="Share on Facebook"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                    onClick={() => shareOnInstagram(ref.referral_code)}
                    title="Share on Instagram"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
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

export default RepairCenterReferralCard;
