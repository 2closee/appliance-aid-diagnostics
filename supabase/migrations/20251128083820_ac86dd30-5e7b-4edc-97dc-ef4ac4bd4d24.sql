-- Create repair center recommendations table
CREATE TABLE IF NOT EXISTS public.repair_center_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  recommended_by_user_id UUID REFERENCES auth.users(id),
  center_name TEXT NOT NULL,
  location TEXT NOT NULL,
  contact_info TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.repair_center_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create recommendations (for both authenticated and anonymous users)
CREATE POLICY "Anyone can create recommendations"
  ON public.repair_center_recommendations
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON public.repair_center_recommendations
  FOR SELECT
  USING (auth.uid() = recommended_by_user_id);

-- Admins can view and manage all recommendations
CREATE POLICY "Admins can view all recommendations"
  ON public.repair_center_recommendations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update recommendations"
  ON public.repair_center_recommendations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_recommendations_status ON public.repair_center_recommendations(status);
CREATE INDEX idx_recommendations_user ON public.repair_center_recommendations(recommended_by_user_id);