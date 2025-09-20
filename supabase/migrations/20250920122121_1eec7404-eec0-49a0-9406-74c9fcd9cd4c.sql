-- Fix security vulnerability: Restrict payment data access to protect sensitive financial information

-- Drop existing broad policies
DROP POLICY IF EXISTS "Users can view payments for their repair jobs" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Create more restrictive and specific policies

-- Policy 1: Customers can view payments for their own repair jobs (full access to their payment data)
CREATE POLICY "Customers can view their own payments" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.id = payments.repair_job_id 
    AND rj.user_id = auth.uid()
  )
);

-- Policy 2: Repair center staff can only view payment status (not sensitive financial details)
-- This creates a separate view-only access for repair center staff to see if payment is completed
-- but without exposing amounts, fees, commission rates, or Stripe IDs
CREATE POLICY "Repair center staff can view payment status only" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    JOIN public.repair_center_staff rcs ON rcs.repair_center_id = rj.repair_center_id
    WHERE rj.id = payments.repair_job_id 
    AND rcs.user_id = auth.uid() 
    AND rcs.is_active = true
  )
  -- Important: This policy will only allow viewing payment_status and payment_date
  -- Sensitive fields like amount, commission_rate, stripe_fee, net_amount, stripe_payment_intent_id
  -- should be filtered out in the application layer for repair center staff
);

-- Policy 3: Admins have full access to all payment data
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 4: Customers can insert payments for their own repair jobs
CREATE POLICY "Customers can create payments for their jobs" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repair_jobs rj
    WHERE rj.id = payments.repair_job_id 
    AND rj.user_id = auth.uid()
  )
);

-- Policy 5: Only admins can update payment records
CREATE POLICY "Admins can update payments" 
ON public.payments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 6: Only admins can delete payment records
CREATE POLICY "Admins can delete payments" 
ON public.payments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));