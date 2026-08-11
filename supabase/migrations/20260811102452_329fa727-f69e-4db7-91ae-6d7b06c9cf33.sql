ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_brief TEXT,
  ADD COLUMN IF NOT EXISTS ai_transcript JSONB;

ALTER TABLE public.repair_jobs
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspection_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspection_findings TEXT;

CREATE INDEX IF NOT EXISTS idx_repair_jobs_conversation_id ON public.repair_jobs(conversation_id);

ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'diagnostics_requested';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'diagnostics_completed';