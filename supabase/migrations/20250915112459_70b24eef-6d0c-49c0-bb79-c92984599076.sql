-- Create storage bucket for diagnostic attachments
insert into storage.buckets (id, name, public) values ('diagnostic-attachments', 'diagnostic-attachments', true);

-- Create policies for diagnostic attachments bucket
create policy "Anyone can view diagnostic attachments" on storage.objects for select using (bucket_id = 'diagnostic-attachments');

create policy "Anyone can upload diagnostic attachments" on storage.objects for insert with check (bucket_id = 'diagnostic-attachments');

create policy "Anyone can update diagnostic attachments" on storage.objects for update using (bucket_id = 'diagnostic-attachments');

create policy "Anyone can delete diagnostic attachments" on storage.objects for delete using (bucket_id = 'diagnostic-attachments');