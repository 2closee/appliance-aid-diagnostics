-- Add diagnostic context columns to conversations table
ALTER TABLE conversations
ADD COLUMN diagnostic_conversation_id uuid REFERENCES diagnostic_conversations(id),
ADD COLUMN source text DEFAULT 'direct' CHECK (source IN ('direct', 'diagnostic')),
ADD COLUMN diagnostic_summary text;

-- Add index for faster queries
CREATE INDEX idx_conversations_diagnostic_id ON conversations(diagnostic_conversation_id);

-- Comments for documentation
COMMENT ON COLUMN conversations.diagnostic_conversation_id IS 'Links conversation to diagnostic session for context';
COMMENT ON COLUMN conversations.source IS 'Origin of conversation: direct contact or from diagnostic flow';
COMMENT ON COLUMN conversations.diagnostic_summary IS 'AI diagnosis summary for repair center context';