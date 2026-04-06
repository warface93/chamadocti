
-- Add status and current_meeting_id to equipment_inventory for loan tracking
ALTER TABLE public.equipment_inventory 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'disponivel',
ADD COLUMN IF NOT EXISTS current_meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Create index for quick status lookups
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment_inventory(status);
