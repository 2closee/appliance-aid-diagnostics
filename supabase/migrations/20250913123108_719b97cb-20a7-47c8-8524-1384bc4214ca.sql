-- Create enum for job status tracking
CREATE TYPE public.job_status AS ENUM ('requested', 'pickup_scheduled', 'picked_up', 'in_repair', 'repair_completed', 'ready_for_return', 'returned', 'completed', 'cancelled');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Create enum for payment type
CREATE TYPE public.payment_type AS ENUM ('repair_service', 'app_commission');

-- Create repair jobs table
CREATE TABLE public.repair_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    repair_center_id BIGINT NOT NULL REFERENCES public."Repair Center"(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    appliance_type TEXT NOT NULL,
    appliance_brand TEXT,
    appliance_model TEXT,
    issue_description TEXT NOT NULL,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    app_commission DECIMAL(10,2),
    job_status job_status NOT NULL DEFAULT 'requested',
    pickup_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    customer_confirmed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id),
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    payment_type payment_type NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    app_owner_id UUID, -- For tracking app owner commissions
    commission_rate DECIMAL(5,4) DEFAULT 0.05, -- 5% commission rate
    stripe_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job status history table for tracking progress
CREATE TABLE public.job_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    repair_job_id UUID NOT NULL REFERENCES public.repair_jobs(id),
    status job_status NOT NULL,
    changed_by UUID, -- Could be user, repair center, or admin
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for repair_jobs
CREATE POLICY "Users can view their own repair jobs"
ON public.repair_jobs
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own repair jobs"
ON public.repair_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can update repair jobs"
ON public.repair_jobs
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete repair jobs"
ON public.repair_jobs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for payments
CREATE POLICY "Users can view payments for their repair jobs"
ON public.payments
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.repair_jobs 
    WHERE repair_jobs.id = payments.repair_job_id 
    AND repair_jobs.user_id = auth.uid()
) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for job_status_history
CREATE POLICY "Users can view status history for their jobs"
ON public.job_status_history
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.repair_jobs 
    WHERE repair_jobs.id = job_status_history.repair_job_id 
    AND repair_jobs.user_id = auth.uid()
) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert status history"
ON public.job_status_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_repair_jobs_updated_at
    BEFORE UPDATE ON public.repair_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically track status changes
CREATE OR REPLACE FUNCTION public.track_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if status actually changed
    IF OLD.job_status IS DISTINCT FROM NEW.job_status THEN
        INSERT INTO public.job_status_history (repair_job_id, status, changed_by, notes)
        VALUES (NEW.id, NEW.job_status, auth.uid(), 'Status updated automatically');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic status tracking
CREATE TRIGGER track_repair_job_status_changes
    AFTER UPDATE ON public.repair_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.track_job_status_change();

-- Create function to calculate app commission
CREATE OR REPLACE FUNCTION public.calculate_app_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate 5% commission when final_cost is set
    IF NEW.final_cost IS NOT NULL AND (OLD.final_cost IS NULL OR OLD.final_cost != NEW.final_cost) THEN
        NEW.app_commission = NEW.final_cost * 0.05;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic commission calculation
CREATE TRIGGER calculate_repair_job_commission
    BEFORE UPDATE ON public.repair_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_app_commission();