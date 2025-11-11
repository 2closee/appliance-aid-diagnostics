-- Create delivery_requests table to track all delivery orders
CREATE TABLE delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id UUID REFERENCES repair_jobs(id) ON DELETE CASCADE,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'return')),
  provider TEXT NOT NULL DEFAULT 'kwik',
  
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  
  -- Delivery details
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'driver_on_way', 'picked_up', 'in_transit', 'driver_arrived', 'delivered', 'failed', 'cancelled')),
  
  -- Provider-specific data
  provider_order_id TEXT,
  tracking_url TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_details TEXT,
  
  -- Timestamps
  scheduled_pickup_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  estimated_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  provider_response JSONB,
  notes TEXT
);

-- Create delivery_status_history table to track status changes
CREATE TABLE delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id UUID REFERENCES delivery_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location JSONB,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create logistics_provider_settings table for repair center logistics configuration
CREATE TABLE logistics_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id BIGINT REFERENCES "Repair Center"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('kwik', 'sendstack', 'manual')),
  is_active BOOLEAN DEFAULT true,
  
  -- Configuration
  auto_assign BOOLEAN DEFAULT false,
  preferred_vehicle_type TEXT DEFAULT 'bike' CHECK (preferred_vehicle_type IN ('bike', 'car', 'van')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repair_center_id, provider)
);

-- Create indexes for better performance
CREATE INDEX idx_delivery_requests_repair_job ON delivery_requests(repair_job_id);
CREATE INDEX idx_delivery_requests_status ON delivery_requests(delivery_status);
CREATE INDEX idx_delivery_requests_provider_order ON delivery_requests(provider_order_id);
CREATE INDEX idx_delivery_status_history_request ON delivery_status_history(delivery_request_id);
CREATE INDEX idx_logistics_provider_center ON logistics_provider_settings(repair_center_id);

-- Enable RLS
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_provider_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_requests
CREATE POLICY "Customers can view own deliveries" ON delivery_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM repair_jobs 
    WHERE repair_jobs.id = delivery_requests.repair_job_id 
    AND repair_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view center deliveries" ON delivery_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rj.repair_center_id = rcs.repair_center_id
    WHERE rj.id = delivery_requests.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

CREATE POLICY "Staff can create deliveries" ON delivery_requests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rj.repair_center_id = rcs.repair_center_id
    WHERE rj.id = delivery_requests.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

CREATE POLICY "Staff can update deliveries" ON delivery_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM repair_jobs rj
    JOIN repair_center_staff rcs ON rj.repair_center_id = rcs.repair_center_id
    WHERE rj.id = delivery_requests.repair_job_id
    AND rcs.user_id = auth.uid()
    AND rcs.is_active = true
  )
);

CREATE POLICY "Admins can manage all deliveries" ON delivery_requests
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for delivery_status_history
CREATE POLICY "Users can view delivery history" ON delivery_status_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN repair_jobs rj ON dr.repair_job_id = rj.id
    WHERE dr.id = delivery_status_history.delivery_request_id
    AND (
      rj.user_id = auth.uid() OR 
      is_staff_at_center(auth.uid(), rj.repair_center_id)
    )
  )
);

CREATE POLICY "System can insert delivery history" ON delivery_status_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage delivery history" ON delivery_status_history
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for logistics_provider_settings
CREATE POLICY "Repair centers view own settings" ON logistics_provider_settings
FOR SELECT USING (is_staff_at_center(auth.uid(), repair_center_id));

CREATE POLICY "Repair centers manage own settings" ON logistics_provider_settings
FOR ALL USING (is_staff_at_center(auth.uid(), repair_center_id))
WITH CHECK (is_staff_at_center(auth.uid(), repair_center_id));

CREATE POLICY "Admins can manage all settings" ON logistics_provider_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_delivery_requests_updated_at
BEFORE UPDATE ON delivery_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistics_provider_settings_updated_at
BEFORE UPDATE ON logistics_provider_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();