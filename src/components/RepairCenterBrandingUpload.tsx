import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingPreview } from "@/components/BrandingPreview";

interface RepairCenterBrandingUploadProps {
  repairCenterId: number | null;
  centerName?: string;
  currentLogoUrl?: string | null;
  currentCoverUrl?: string | null;
  onUploadComplete?: () => void;
}

const RepairCenterBrandingUpload = ({
  repairCenterId,
  centerName = "Your Repair Center",
  currentLogoUrl,
  currentCoverUrl,
  onUploadComplete
}: RepairCenterBrandingUploadProps) => {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(currentCoverUrl || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleFileUpload = async (
    file: File,
    type: 'logo' | 'cover'
  ) => {
    if (!repairCenterId) {
      toast({
        title: "Error",
        description: "Repair center ID not found",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover;
    const setPreview = type === 'logo' ? setLogoPreview : setCoverPreview;

    setUploading(true);

    try {
      // Debug: Log current user context
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Current user ID:', user?.id);
      console.log('🔍 Repair center ID:', repairCenterId);
      
      if (userError) {
        console.error('❌ User auth error:', userError);
      }

      // Debug: Verify staff relationship
      const { data: staffCheck, error: staffError } = await supabase
        .from('repair_center_staff')
        .select('*')
        .eq('user_id', user?.id)
        .eq('repair_center_id', repairCenterId)
        .eq('is_active', true);
      
      console.log('🔍 Staff check result:', staffCheck);
      if (staffError) {
        console.error('❌ Staff check error:', staffError);
      }

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `${repairCenterId}/${fileName}`;

      console.log('📤 Uploading to path:', filePath);

      // Delete old file if exists
      const { error: deleteError } = await supabase.storage
        .from('repair-center-branding')
        .remove([filePath]);

      if (deleteError && deleteError.message !== 'The resource was not found') {
        console.warn('⚠️ Error deleting old file:', deleteError);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('repair-center-branding')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded successfully');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('repair-center-branding')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', publicUrl);

      // Use RPC function for secure database update
      const { error: updateError } = await supabase.rpc('update_repair_center_branding', {
        _center_id: repairCenterId,
        [type === 'logo' ? '_logo_url' : '_cover_url']: publicUrl
      });

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        console.error('❌ Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw updateError;
      }

      console.log('✅ Database updated successfully');

      setPreview(publicUrl);
      toast({
        title: "Success",
        description: `${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`
      });

      onUploadComplete?.();
    } catch (error: any) {
      console.error('❌ Upload error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        repairCenterId,
        type
      });
      
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload image. Please check console for details.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (type: 'logo' | 'cover') => {
    if (!repairCenterId) return;

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover;
    const setPreview = type === 'logo' ? setLogoPreview : setCoverPreview;

    setUploading(true);

    try {
      console.log('🗑️ Removing image:', { type, repairCenterId });

      // Use RPC function for secure removal (set to null)
      const { error } = await supabase.rpc('update_repair_center_branding', {
        _center_id: repairCenterId,
        [type === 'logo' ? '_logo_url' : '_cover_url']: null
      });

      if (error) {
        console.error('❌ Remove error:', error);
        throw error;
      }

      console.log('✅ Image removed successfully');

      setPreview(null);
      toast({
        title: "Success",
        description: `${type === 'logo' ? 'Logo' : 'Cover image'} removed successfully`
      });

      onUploadComplete?.();
    } catch (error: any) {
      console.error('❌ Remove error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      
      toast({
        title: "Failed to remove image",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload Branding</TabsTrigger>
        <TabsTrigger value="preview">Live Preview</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-6 mt-6">
        {/* Logo Upload */}
        <div className="space-y-3">
        <Label>Logo (Square, 200x200px to 400x400px recommended)</Label>
        <Card className="p-4">
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <img 
                src={logoPreview} 
                alt="Logo preview"
                className="w-24 h-24 rounded-lg object-cover border-2 border-border"
              />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Current logo</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={isUploadingLogo}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage('logo')}
                    disabled={isUploadingLogo}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No logo uploaded</p>
              <Button
                size="sm"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={isUploadingLogo}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          )}
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'logo');
            }}
          />
        </Card>
      </div>

      {/* Cover Image Upload */}
      <div className="space-y-3">
        <Label>Cover Image (Wide, 1200x300px recommended)</Label>
        <Card className="p-4">
          {coverPreview ? (
            <div className="space-y-4">
              <img 
                src={coverPreview} 
                alt="Cover preview"
                className="w-full h-32 rounded-lg object-cover border-2 border-border"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                  disabled={isUploadingCover}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveImage('cover')}
                  disabled={isUploadingCover}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No cover image uploaded</p>
              <Button
                size="sm"
                onClick={() => document.getElementById('cover-upload')?.click()}
                disabled={isUploadingCover}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Cover Image
              </Button>
            </div>
          )}
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'cover');
            }}
          />
        </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="preview" className="mt-6">
        <BrandingPreview 
          logoUrl={logoPreview || undefined}
          coverUrl={coverPreview || undefined}
          centerName={centerName}
        />
      </TabsContent>
    </Tabs>
  );
};

export default RepairCenterBrandingUpload;
