import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  whitelisted_at: string;
  last_updated_at: string;
  is_active: boolean;
}

interface BankAccountManagerProps {
  repairCenterId: number;
  businessName: string;
}

export default function BankAccountManager({ repairCenterId, businessName }: BankAccountManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  useEffect(() => {
    fetchBankAccount();
  }, [repairCenterId]);

  const fetchBankAccount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repair_center_bank_accounts")
        .select("*")
        .eq("repair_center_id", repairCenterId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAccount(data);
        setFormData({
          bank_name: data.bank_name,
          account_number: data.account_number,
          account_name: data.account_name,
        });
      }
    } catch (error: any) {
      console.error("Error fetching bank account:", error);
      toast.error("Failed to load bank account details");
    } finally {
      setLoading(false);
    }
  };

  const canEditAccount = () => {
    if (!account) return true;
    
    const lastUpdated = new Date(account.last_updated_at);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    return lastUpdated <= twoWeeksAgo;
  };

  const getDaysUntilEdit = () => {
    if (!account) return 0;
    
    const lastUpdated = new Date(account.last_updated_at);
    const twoWeeksFromUpdate = new Date(lastUpdated);
    twoWeeksFromUpdate.setDate(twoWeeksFromUpdate.getDate() + 14);
    
    const now = new Date();
    const daysRemaining = Math.ceil((twoWeeksFromUpdate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEditAccount()) {
      const daysRemaining = getDaysUntilEdit();
      toast.error(`Account can only be changed after 2 weeks. ${daysRemaining} days remaining.`);
      return;
    }

    // Validate account name matches business name
    if (formData.account_name.toLowerCase() !== businessName.toLowerCase()) {
      toast.error("Account name must match your registered business name");
      return;
    }

    try {
      setSaving(true);

      if (account) {
        // Update existing account
        const { error } = await supabase
          .from("repair_center_bank_accounts")
          .update({
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            account_name: formData.account_name,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        if (error) throw error;
        toast.success("Bank account updated successfully");
      } else {
        // Create new account
        const { error } = await supabase
          .from("repair_center_bank_accounts")
          .insert({
            repair_center_id: repairCenterId,
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            account_name: formData.account_name,
          });

        if (error) throw error;

        // Send whitelisting notification
        try {
          const { data: centerData } = await supabase
            .from("Repair Center")
            .select("name, email")
            .eq("id", repairCenterId)
            .single();

          if (centerData) {
            await supabase.functions.invoke("send-job-notification", {
              body: {
                email_type: "bank_account_whitelisted",
                repair_center_email: centerData.email,
                repair_center_name: centerData.name,
                bank_name: formData.bank_name,
                account_number: formData.account_number,
                account_name: formData.account_name,
              },
            });
          }
        } catch (emailError) {
          console.error("Failed to send notification:", emailError);
          // Don't fail the operation if email fails
        }

        toast.success("Bank account added and whitelisted successfully");
      }

      await fetchBankAccount();
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving bank account:", error);
      toast.error(error.message || "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Bank Account Information
        </CardTitle>
        <CardDescription>
          Manage your bank account for receiving payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {account && !isEditing ? (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your bank account is whitelisted and ready to receive payouts
              </AlertDescription>
            </Alert>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label className="text-muted-foreground">Bank Name</Label>
                <p className="font-medium">{account.bank_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Number</Label>
                <p className="font-medium">****{account.account_number.slice(-4)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Name</Label>
                <p className="font-medium">{account.account_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Whitelisted</Label>
                <p className="text-sm">{formatDistanceToNow(new Date(account.whitelisted_at), { addSuffix: true })}</p>
              </div>
            </div>

            {!canEditAccount() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account can be changed in {getDaysUntilEdit()} days (2-week security restriction)
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={() => setIsEditing(true)}
              disabled={!canEditAccount()}
              variant="outline"
              className="w-full"
            >
              Update Bank Account
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g., First Bank, GTBank"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Enter 10-digit account number"
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name * (Must match business name)</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder={businessName}
                required
              />
              <p className="text-xs text-muted-foreground">
                Expected: {businessName}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once saved, this account will be whitelisted and can only be changed after 2 weeks.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {account ? "Update Account" : "Add Account"}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
