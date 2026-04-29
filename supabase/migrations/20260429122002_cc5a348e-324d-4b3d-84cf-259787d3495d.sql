ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER TABLE public.equipment_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.meeting_equipment REPLICA IDENTITY FULL;
ALTER TABLE public.meeting_admin_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='meetings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='equipment_inventory') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_inventory;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='meeting_equipment') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_equipment;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='meeting_admin_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_admin_items;
  END IF;
END $$;