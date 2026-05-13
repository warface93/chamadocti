ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS assigned_admin_id uuid,
ADD COLUMN IF NOT EXISTS assigned_admin_name text;