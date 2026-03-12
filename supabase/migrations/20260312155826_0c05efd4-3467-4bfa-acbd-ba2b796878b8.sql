
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status_changed_by text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;
