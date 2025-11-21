-- Enable realtime for delivery tracking
ALTER TABLE delivery_status_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_status_history;
