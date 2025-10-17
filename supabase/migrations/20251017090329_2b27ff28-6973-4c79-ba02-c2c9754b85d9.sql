-- Tier 1 & Tier 2: Create tables for enhanced AI diagnostic features

-- 1. Diagnostic conversations table
CREATE TABLE IF NOT EXISTS public.diagnostic_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  appliance_type TEXT NOT NULL,
  appliance_brand TEXT,
  appliance_model TEXT,
  initial_diagnosis TEXT NOT NULL,
  final_diagnosis TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Diagnostic messages table (conversation history)
CREATE TABLE IF NOT EXISTS public.diagnostic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.diagnostic_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB, -- Store image URLs, audio URLs, etc.
  metadata JSONB, -- Store confidence scores, recommendations, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Diagnostic reports table
CREATE TABLE IF NOT EXISTS public.diagnostic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.diagnostic_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL, -- Full diagnostic report with recommendations
  estimated_cost_min DECIMAL(10,2),
  estimated_cost_max DECIMAL(10,2),
  recommended_parts JSONB, -- Array of parts with details
  repair_urgency TEXT CHECK (repair_urgency IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostic_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostic_conversations
CREATE POLICY "Users can view own conversations"
  ON public.diagnostic_conversations FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create own conversations"
  ON public.diagnostic_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own conversations"
  ON public.diagnostic_conversations FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Admins can view all conversations"
  ON public.diagnostic_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for diagnostic_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.diagnostic_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_conversations dc
      WHERE dc.id = diagnostic_messages.conversation_id
      AND (dc.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.diagnostic_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diagnostic_conversations dc
      WHERE dc.id = diagnostic_messages.conversation_id
      AND (dc.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

-- RLS Policies for diagnostic_reports
CREATE POLICY "Users can view own reports"
  ON public.diagnostic_reports FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create own reports"
  ON public.diagnostic_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Admins can view all reports"
  ON public.diagnostic_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_diagnostic_conversations_user_id ON public.diagnostic_conversations(user_id);
CREATE INDEX idx_diagnostic_messages_conversation_id ON public.diagnostic_messages(conversation_id);
CREATE INDEX idx_diagnostic_reports_user_id ON public.diagnostic_reports(user_id);
CREATE INDEX idx_diagnostic_reports_conversation_id ON public.diagnostic_reports(conversation_id);

-- Create updated_at trigger for diagnostic_conversations
CREATE TRIGGER update_diagnostic_conversations_updated_at
  BEFORE UPDATE ON public.diagnostic_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();