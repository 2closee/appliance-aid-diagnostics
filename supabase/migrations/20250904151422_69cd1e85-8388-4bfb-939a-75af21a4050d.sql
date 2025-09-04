-- Create RLS policies for Repair Center table
-- Allow public read access so customers can find repair centers
CREATE POLICY "Allow public read access to repair centers" 
ON public."Repair Center" 
FOR SELECT 
USING (true);

-- For now, allow anyone to insert repair centers (until we have admin auth)
-- This will be updated once authentication is implemented
CREATE POLICY "Allow public insert to repair centers" 
ON public."Repair Center" 
FOR INSERT 
WITH CHECK (true);

-- Allow public updates (will be restricted to admin later)
CREATE POLICY "Allow public update to repair centers" 
ON public."Repair Center" 
FOR UPDATE 
USING (true);

-- Allow public delete (will be restricted to admin later)
CREATE POLICY "Allow public delete to repair centers" 
ON public."Repair Center" 
FOR DELETE 
USING (true);

-- Create RLS policies for settings table
-- For now, allow public access (will be restricted to admin later)
CREATE POLICY "Allow public read access to settings" 
ON public.settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to settings" 
ON public.settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to settings" 
ON public.settings 
FOR DELETE 
USING (true);