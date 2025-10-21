-- Create security definer function to check if user is staff at a center
-- This prevents infinite recursion in RLS policies
create or replace function public.is_staff_at_center(_user_id uuid, _center_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.repair_center_staff
    where user_id = _user_id
      and repair_center_id = _center_id
      and is_active = true
  )
$$;

-- Drop and recreate the problematic policy on repair_center_staff
drop policy if exists "Staff can only view same center staff" on public.repair_center_staff;

create policy "Staff can only view same center staff"
on public.repair_center_staff
for select
using (
  public.is_staff_at_center(auth.uid(), repair_center_staff.repair_center_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update conversations policies
drop policy if exists "Repair center staff can view their center conversations" on public.conversations;

create policy "Repair center staff can view their center conversations"
on public.conversations
for select
using (
  public.is_staff_at_center(auth.uid(), conversations.repair_center_id)
);

-- Update messages policies
drop policy if exists "Users can send messages in their conversations" on public.messages;

create policy "Users can send messages in their conversations"
on public.messages
for insert
with check (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (c.customer_id = auth.uid() AND messages.sender_type = 'customer')
      OR (public.is_staff_at_center(auth.uid(), c.repair_center_id) AND messages.sender_type = 'repair_center')
    )
  )
);

drop policy if exists "Users can view messages in their conversations" on public.messages;

create policy "Users can view messages in their conversations"
on public.messages
for select
using (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.customer_id = auth.uid()
      OR public.is_staff_at_center(auth.uid(), c.repair_center_id)
    )
  )
);

drop policy if exists "Users can update read status of their messages" on public.messages;

create policy "Users can update read status of their messages"
on public.messages
for update
using (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.customer_id = auth.uid()
      OR public.is_staff_at_center(auth.uid(), c.repair_center_id)
    )
  )
);

-- Update repair_jobs policies
drop policy if exists "Authenticated repair center staff can update jobs for their cen" on public.repair_jobs;

create policy "Authenticated repair center staff can update jobs for their cen"
on public.repair_jobs
for update
using (
  public.is_staff_at_center(auth.uid(), repair_jobs.repair_center_id)
)
with check (
  public.is_staff_at_center(auth.uid(), repair_jobs.repair_center_id)
);

drop policy if exists "Authenticated repair center staff can view jobs for their cente" on public.repair_jobs;

create policy "Authenticated repair center staff can view jobs for their cente"
on public.repair_jobs
for select
using (
  public.is_staff_at_center(auth.uid(), repair_jobs.repair_center_id)
);

-- Update repair_center_settings policies
drop policy if exists "Repair center staff can create their settings" on public.repair_center_settings;

create policy "Repair center staff can create their settings"
on public.repair_center_settings
for insert
with check (
  public.is_staff_at_center(auth.uid(), repair_center_settings.repair_center_id)
);

drop policy if exists "Repair center staff can update their settings" on public.repair_center_settings;

create policy "Repair center staff can update their settings"
on public.repair_center_settings
for update
using (
  public.is_staff_at_center(auth.uid(), repair_center_settings.repair_center_id)
)
with check (
  public.is_staff_at_center(auth.uid(), repair_center_settings.repair_center_id)
);

drop policy if exists "Repair center staff can view their settings" on public.repair_center_settings;

create policy "Repair center staff can view their settings"
on public.repair_center_settings
for select
using (
  public.is_staff_at_center(auth.uid(), repair_center_settings.repair_center_id)
);

-- Update Repair Center policies
drop policy if exists "Repair center staff can view their center" on public."Repair Center";

create policy "Repair center staff can view their center"
on public."Repair Center"
for select
using (
  public.is_staff_at_center(auth.uid(), "Repair Center".id)
);

drop policy if exists "Staff can view own center data" on public."Repair Center";

create policy "Staff can view own center data"
on public."Repair Center"
for select
using (
  public.is_staff_at_center(auth.uid(), "Repair Center".id)
);

drop policy if exists "Admins and staff can view repair centers" on public."Repair Center";

create policy "Admins and staff can view repair centers"
on public."Repair Center"
for select
using (
  has_role(auth.uid(), 'admin'::app_role) 
  OR public.is_staff_at_center(auth.uid(), "Repair Center".id)
);

-- Update payments policies
drop policy if exists "Repair center staff can view payment status only" on public.payments;

create policy "Repair center staff can view payment status only"
on public.payments
for select
using (
  EXISTS (
    SELECT 1
    FROM repair_jobs rj
    WHERE rj.id = payments.repair_job_id
    AND public.is_staff_at_center(auth.uid(), rj.repair_center_id)
  )
);