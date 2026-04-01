-- Add theme field to meetings
ALTER TABLE public.meetings ADD COLUMN theme text;

-- Create equipment inventory table
CREATE TABLE public.equipment_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  brand text NOT NULL,
  tombamento text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage equipment"
ON public.equipment_inventory
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Everyone can view equipment"
ON public.equipment_inventory
FOR SELECT
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_equipment_inventory_updated_at
BEFORE UPDATE ON public.equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();