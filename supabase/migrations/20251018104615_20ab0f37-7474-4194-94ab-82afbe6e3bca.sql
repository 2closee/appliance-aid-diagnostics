-- Create repair center settings table for auto-reply and online status
CREATE TABLE IF NOT EXISTS public.repair_center_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  auto_reply_enabled BOOLEAN DEFAULT true,
  auto_reply_message TEXT DEFAULT 'Thank you for your message. We are currently unavailable. We will respond as soon as possible during our business hours.',
  is_online BOOLEAN DEFAULT false,
  business_hours JSONB DEFAULT '{"monday": "9:00-18:00", "tuesday": "9:00-18:00", "wednesday": "9:00-18:00", "thursday": "9:00-18:00", "friday": "9:00-18:00", "saturday": "10:00-16:00", "sunday": "closed"}',
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(repair_center_id)
);

-- Enable RLS
ALTER TABLE public.repair_center_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repair_center_settings
CREATE POLICY "Repair center staff can view their settings"
  ON public.repair_center_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_center_staff rcs
      WHERE rcs.repair_center_id = repair_center_settings.repair_center_id
      AND rcs.user_id = auth.uid()
      AND rcs.is_active = true
    )
  );

CREATE POLICY "Repair center staff can update their settings"
  ON public.repair_center_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_center_staff rcs
      WHERE rcs.repair_center_id = repair_center_settings.repair_center_id
      AND rcs.user_id = auth.uid()
      AND rcs.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_center_staff rcs
      WHERE rcs.repair_center_id = repair_center_settings.repair_center_id
      AND rcs.user_id = auth.uid()
      AND rcs.is_active = true
    )
  );

CREATE POLICY "Repair center staff can create their settings"
  ON public.repair_center_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_center_staff rcs
      WHERE rcs.repair_center_id = repair_center_settings.repair_center_id
      AND rcs.user_id = auth.uid()
      AND rcs.is_active = true
    )
  );

CREATE POLICY "Customers can view settings for their conversations"
  ON public.repair_center_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.repair_center_id = repair_center_settings.repair_center_id
      AND c.customer_id = auth.uid()
    )
  );

-- Add message priority and typing support to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_auto_reply BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_repair_center_settings_updated_at
  BEFORE UPDATE ON public.repair_center_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create default settings for existing repair centers
INSERT INTO public.repair_center_settings (repair_center_id)
SELECT id FROM public."Repair Center"
WHERE id NOT IN (SELECT repair_center_id FROM public.repair_center_settings)
ON CONFLICT (repair_center_id) DO NOTHING;