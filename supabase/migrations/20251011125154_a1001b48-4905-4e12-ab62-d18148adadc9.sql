-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_job_id UUID REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'repair_center')),
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Customers can view their own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Repair center staff can view their center conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.repair_center_staff rcs
    WHERE rcs.user_id = auth.uid()
    AND rcs.repair_center_id = conversations.repair_center_id
    AND rcs.is_active = true
  )
);

CREATE POLICY "Customers can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.repair_center_staff rcs
        WHERE rcs.user_id = auth.uid()
        AND rcs.repair_center_id = c.repair_center_id
        AND rcs.is_active = true
      )
    )
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (c.customer_id = auth.uid() AND sender_type = 'customer')
      OR (
        EXISTS (
          SELECT 1 FROM public.repair_center_staff rcs
          WHERE rcs.user_id = auth.uid()
          AND rcs.repair_center_id = c.repair_center_id
          AND rcs.is_active = true
        )
        AND sender_type = 'repair_center'
      )
    )
  )
);

CREATE POLICY "Users can update read status of their messages"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.repair_center_staff rcs
        WHERE rcs.user_id = auth.uid()
        AND rcs.repair_center_id = c.repair_center_id
        AND rcs.is_active = true
      )
    )
  )
);

CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX idx_conversations_repair_center ON public.conversations(repair_center_id);
CREATE INDEX idx_conversations_repair_job ON public.conversations(repair_job_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Create trigger for updating conversations updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;