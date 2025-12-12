-- Fix diagnostic_messages RLS policies to prevent public exposure
-- The issue: (auth.uid() IS NULL) allows anonymous users to read ALL messages

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON diagnostic_messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON diagnostic_messages;

-- Create new policy: Authenticated users can view their own conversation messages
CREATE POLICY "Users can view own conversation messages"
ON diagnostic_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diagnostic_conversations dc
    WHERE dc.id = diagnostic_messages.conversation_id
    AND dc.user_id = auth.uid()
  )
);

-- Create new policy: Authenticated users can create messages in their own conversations
CREATE POLICY "Users can create own conversation messages"
ON diagnostic_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diagnostic_conversations dc
    WHERE dc.id = diagnostic_messages.conversation_id
    AND dc.user_id = auth.uid()
  )
);

-- Add admin access for support purposes
CREATE POLICY "Admins can view all diagnostic messages"
ON diagnostic_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix diagnostic_conversations table which has the same issue
DROP POLICY IF EXISTS "Users can view own conversations" ON diagnostic_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON diagnostic_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON diagnostic_conversations;

-- Authenticated users can view their own conversations
CREATE POLICY "Users can view own diagnostic conversations"
ON diagnostic_conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can create conversations (must set their user_id)
CREATE POLICY "Users can create own diagnostic conversations"
ON diagnostic_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own conversations
CREATE POLICY "Users can update own diagnostic conversations"
ON diagnostic_conversations
FOR UPDATE
USING (auth.uid() = user_id);