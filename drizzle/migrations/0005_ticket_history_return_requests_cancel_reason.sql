
-- 1. Ticket change history (immutable audit log)
CREATE TABLE public.ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  actor_name text,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_history TO authenticated;
GRANT ALL ON public.ticket_history TO service_role;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view history of accessible tickets"
  ON public.ticket_history FOR SELECT TO authenticated
  USING (public.is_ticket_owner(ticket_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Users can add history to accessible tickets"
  ON public.ticket_history FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND (public.is_ticket_owner(ticket_id, auth.uid()) OR public.is_admin(auth.uid())));

-- 2. Optional resolution note on tickets
ALTER TABLE public.tickets ADD COLUMN resolution_note text;

-- 3. Equipment return requests (user requests, admin confirms or refuses)
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.meeting_admin_items(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES public.equipment_inventory(id),
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requested_by_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  admin_id uuid,
  admin_name text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view return requests of accessible meetings"
  ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = return_requests.meeting_id AND m.user_id = auth.uid()));
CREATE POLICY "Meeting owners can request returns"
  ON public.return_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = return_requests.meeting_id AND m.user_id = auth.uid()));
CREATE POLICY "Admins can resolve return requests"
  ON public.return_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Cancellation reason on meetings
ALTER TABLE public.meetings ADD COLUMN cancel_reason text;

-- 5. cancel_meeting now requires a reason and stores it
CREATE OR REPLACE FUNCTION public.cancel_meeting(_meeting_id uuid, _reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m public.meetings%ROWTYPE;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=_meeting_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada.'; END IF;
 IF auth.uid() IS NULL OR (m.user_id<>auth.uid() AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Sem permissão para cancelar esta reunião.'; END IF;
 IF m.status='cancelada' THEN RAISE EXCEPTION 'Esta reunião já foi cancelada.'; END IF;
 IF m.status<>'em_uso' THEN RAISE EXCEPTION 'Só é possível cancelar uma reunião reservada.'; END IF;
 IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento da reunião.'; END IF;
 UPDATE public.meetings SET status='cancelada', cancel_reason=trim(_reason) WHERE id=_meeting_id;
 -- Loans stay outstanding until an administrator records their physical return.
END $function$;

-- 6. Meeting equipment editing: admins manage all; owners remove items of own active meetings
CREATE POLICY "Admins can manage meeting equipment"
  ON public.meeting_equipment FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Users can delete equipment of own active meetings"
  ON public.meeting_equipment FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_equipment.meeting_id AND m.user_id = auth.uid() AND m.status = 'em_uso'));

-- 7. Realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.return_requests;
