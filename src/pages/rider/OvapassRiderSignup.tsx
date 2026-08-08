import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bike, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import PhoneVerificationField from "@/components/PhoneVerificationField";

type FileField = "id_doc" | "bike_photo" | "selfie";

const OvapassRiderSignup = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    fleet_type: "partner",
    bike_make: "",
    plate_number: "",
    guarantor_name: "",
    guarantor_phone: "",
  });
  const [files, setFiles] = useState<Record<FileField, File | null>>({
    id_doc: null,
    bike_photo: null,
    selfie: null,
  });

  // Send signed-out visitors to sign in, then bring them straight back here.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true, state: { from: { pathname: "/rider/signup" } } });
      return;
    }
    let active = true;
    Promise.all([
      supabase.from("riders").select("kyc_status").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("phone, phone_verified_at").eq("id", user.id).maybeSingle(),
    ]).then(([riderRes, profileRes]) => {
      if (!active) return;
      setExistingStatus(riderRes.data?.kyc_status ?? null);
      // A number already verified on the profile carries over to the application.
      if (profileRes.data?.phone_verified_at && profileRes.data.phone) {
        setForm((f) => ({ ...f, phone: profileRes.data!.phone as string }));
        setPhoneVerified(true);
      }
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [user, authLoading, navigate]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const uploadFile = async (field: FileField, file: File | null) => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("rider-kyc").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };


  const handleSubmit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!form.full_name || !form.phone) {
      toast({ title: "Missing details", description: "Your name and phone number are required.", variant: "destructive" });
      return;
    }
    if (!phoneVerified) {
      toast({
        title: "Verify your phone number",
        description: "Send yourself a code and confirm it before submitting.",
        variant: "destructive",
      });
      return;
    }


    setSaving(true);
    try {
      const [idDoc, bikePhoto, selfie] = await Promise.all([
        uploadFile("id_doc", files.id_doc),
        uploadFile("bike_photo", files.bike_photo),
        uploadFile("selfie", files.selfie),
      ]);

      const { error } = await supabase.from("riders").insert({
        user_id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        email: user.email,
        fleet_type: form.fleet_type,
        bike_make: form.bike_make || null,
        plate_number: form.plate_number || null,
        guarantor_name: form.guarantor_name || null,
        guarantor_phone: form.guarantor_phone || null,
        id_doc_url: idDoc,
        bike_photo_url: bikePhoto,
        selfie_url: selfie,
      });

      if (error) throw error;

      toast({ title: "Application submitted", description: "We'll review your details and get back to you shortly." });
      setSubmitted(true);
    } catch (e) {
      toast({ title: "Could not submit", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>Application received</CardTitle>
            <CardDescription>
              We review rider applications within 24 to 48 hours. You'll be able to go online as soon as
              you're approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/rider")}>
              Go to rider dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingStatus) {
    const approved = existingStatus === "approved";
    const rejected = existingStatus === "rejected";
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Badge variant={rejected ? "destructive" : approved ? "default" : "secondary"} className="mx-auto">
              {approved ? "Approved" : rejected ? "Not approved" : "Under review"}
            </Badge>
            <CardTitle className="mt-2">You already applied</CardTitle>
            <CardDescription>
              {approved
                ? "You're verified. Head to your rider dashboard to go online and take trips."
                : rejected
                ? "Your application wasn't approved. Contact support if you'd like us to take another look."
                : "We're still reviewing your documents. We'll let you know as soon as you're verified."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => navigate("/rider")}>
              Open rider dashboard
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/ovapass">Learn more about Ovapass</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Become an Ovapass rider</h1>
            <p className="text-sm text-muted-foreground">Pick up and deliver devices for FixBudi repair centers.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your details</CardTitle>
            <CardDescription>We verify every rider before the first trip.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} />
            </div>
            <PhoneVerificationField
              value={form.phone}
              onChange={set("phone")}
              verified={phoneVerified}
              onVerified={(phone) => {
                set("phone")(phone);
                setPhoneVerified(true);
              }}
              description="Riders must verify their number — repair centers and customers call it during pickups."
            />

            <div className="space-y-2">
              <Label>Whose bike will you ride?</Label>
              <Select value={form.fleet_type} onValueChange={set("fleet_type")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Third-party rider — my own bike</SelectItem>
                  <SelectItem value="company">FixBudi rider — a FixBudi electric bike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bike_make">Bike make</Label>
                <Input id="bike_make" value={form.bike_make} onChange={(e) => set("bike_make")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate number</Label>
                <Input id="plate_number" value={form.plate_number} onChange={(e) => set("plate_number")(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="guarantor_name">Guarantor name</Label>
                <Input id="guarantor_name" value={form.guarantor_name} onChange={(e) => set("guarantor_name")(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guarantor_phone">Guarantor phone</Label>
                <Input id="guarantor_phone" value={form.guarantor_phone} onChange={(e) => set("guarantor_phone")(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verification documents
            </CardTitle>
            <CardDescription>Government ID, a photo of your bike, and a clear selfie.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ["id_doc", "Government ID"],
              ["bike_photo", "Photo of your bike"],
              ["selfie", "Selfie"],
            ] as [FileField, string][]).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label}</Label>
                <Input
                  id={field}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFiles((f) => ({ ...f, [field]: e.target.files?.[0] ?? null }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit application
        </Button>
      </div>
    </div>
  );
};

export default OvapassRiderSignup;
