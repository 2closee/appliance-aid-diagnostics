import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConditionPhotoUploadProps {
  deliveryRequestId: string;
  repairJobId: string;
  phase: "pre_pickup" | "pre_return";
  maxPhotos?: number;
}

interface Photo {
  id: string;
  photo_url: string;
}

export const ConditionPhotoUpload = ({
  deliveryRequestId,
  repairJobId,
  phase,
  maxPhotos = 4,
}: ConditionPhotoUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("delivery_condition_photos")
        .select("id, photo_url")
        .eq("delivery_request_id", deliveryRequestId)
        .eq("phase", phase)
        .order("created_at", { ascending: true });
      if (data) setPhotos(data as Photo[]);
    })();
  }, [deliveryRequestId, phase]);

  const handleFile = async (file: File) => {
    if (photos.length >= maxPhotos) {
      toast({ title: "Limit reached", description: `Max ${maxPhotos} photos.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/${deliveryRequestId}/${phase}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("delivery-condition-photos")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("delivery-condition-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 30);

      const { data: inserted, error: insErr } = await supabase
        .from("delivery_condition_photos")
        .insert({
          delivery_request_id: deliveryRequestId,
          repair_job_id: repairJobId,
          phase,
          photo_url: path,
          uploaded_by: uid,
        })
        .select("id, photo_url")
        .single();
      if (insErr) throw insErr;

      setPhotos((p) => [...p, { id: inserted.id, photo_url: signed?.signedUrl ?? path }]);
      toast({ title: "Photo saved", description: "Condition proof uploaded." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-5 w-5 text-primary" />
          Condition photos ({phase === "pre_pickup" ? "before pickup" : "before return"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Snap {maxPhotos} clear photos of the device before handing it over. This protects you,
          the rider, and the repair center from "already scratched" disputes.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="aspect-square rounded-md bg-muted overflow-hidden border">
              <img src={p.photo_url} alt="Condition proof" className="w-full h-full object-cover" />
            </div>
          ))}
          {photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-md border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:bg-muted transition"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </CardContent>
    </Card>
  );
};
