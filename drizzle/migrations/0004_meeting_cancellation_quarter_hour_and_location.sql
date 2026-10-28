ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz, ADD COLUMN IF NOT EXISTS cancelled_by uuid, ADD COLUMN IF NOT EXISTS cancelled_by_name text;
CREATE OR REPLACE FUNCTION public.guard_meeting_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid := auth.uid(); scheduling_changed boolean; actor_admin boolean := public.is_admin(auth.uid());
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelada' AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Uma reunião cancelada não pode ser reaberta.'; END IF;
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by OR NEW.cancelled_by_name IS DISTINCT FROM OLD.cancelled_by_name THEN RAISE EXCEPTION 'O histórico de cancelamento não pode ser alterado.'; END IF;
    scheduling_changed := NEW.meeting_date IS DISTINCT FROM OLD.meeting_date OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time OR NEW.location IS DISTINCT FROM OLD.location OR (NEW.status = 'em_uso' AND OLD.status <> 'em_uso');
    IF NEW.status = 'cancelada' AND OLD.status <> 'cancelada' THEN
      IF actor IS NULL OR (actor <> OLD.user_id AND NOT actor_admin) THEN RAISE EXCEPTION 'Sem permissão para cancelar esta reunião.'; END IF;
      IF OLD.status <> 'em_uso' THEN RAISE EXCEPTION 'Só é possível cancelar uma reunião reservada.'; END IF;
      NEW.cancelled_at := now(); NEW.cancelled_by := actor;
      SELECT name INTO NEW.cancelled_by_name FROM public.profiles WHERE id=actor;
    END IF;
  ELSE
    scheduling_changed := true;
    IF NEW.status = 'cancelada' OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_by_name IS NOT NULL THEN RAISE EXCEPTION 'Histórico de cancelamento inválido.'; END IF;
  END IF;
  IF TG_OP='INSERT' OR NEW.location IS DISTINCT FROM OLD.location OR NEW.other_description IS DISTINCT FROM OLD.other_description THEN
    IF NEW.location='Outro Local' THEN
      IF nullif(trim(NEW.other_description),'') IS NULL THEN RAISE EXCEPTION 'Descreva o local da reunião.'; END IF;
      NEW.other_description := trim(NEW.other_description);
    ELSE NEW.other_description := NULL;
    END IF;
  END IF;
  IF NEW.status='em_uso' AND scheduling_changed THEN
    IF NEW.start_time !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' OR NEW.end_time !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Horário inválido.'; END IF;
    IF NOT actor_admin AND (right(NEW.start_time,2) NOT IN ('00','15','30','45') OR right(NEW.end_time,2) NOT IN ('00','15','30','45')) THEN RAISE EXCEPTION 'Selecione horários em intervalos de 15 minutos.'; END IF;
    IF NEW.location IN ('3° Andar','2° Andar','Auditório') THEN
      PERFORM pg_advisory_xact_lock(hashtext(NEW.location || NEW.meeting_date::text));
      IF EXISTS (SELECT 1 FROM public.meetings m WHERE m.id<>NEW.id AND m.status='em_uso' AND m.meeting_date=NEW.meeting_date AND m.location=NEW.location AND NEW.start_time<m.end_time AND NEW.end_time>m.start_time) THEN RAISE EXCEPTION 'Conflito de horário! Já existe uma reunião neste local e horário.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_meeting_changes BEFORE INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.guard_meeting_changes();
CREATE OR REPLACE FUNCTION public.cancel_meeting(_meeting_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings%ROWTYPE;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=_meeting_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada.'; END IF;
 IF auth.uid() IS NULL OR (m.user_id<>auth.uid() AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Sem permissão para cancelar esta reunião.'; END IF;
 IF m.status='cancelada' THEN RAISE EXCEPTION 'Esta reunião já foi cancelada.'; END IF;
 IF m.status<>'em_uso' THEN RAISE EXCEPTION 'Só é possível cancelar uma reunião reservada.'; END IF;
 UPDATE public.meetings SET status='cancelada' WHERE id=_meeting_id;
 -- Loans stay outstanding until an administrator records their physical return.
END $$;
REVOKE ALL ON FUNCTION public.cancel_meeting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_meeting(uuid) TO authenticated, service_role;
COMMENT ON COLUMN public.meetings.cancelled_at IS 'Immutable cancellation audit timestamp; cancellation never automatically returns loaned equipment.';
CREATE OR REPLACE FUNCTION public.guard_meeting_loan_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.meetings WHERE id=NEW.meeting_id AND status='em_uso' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Só é possível emprestar para uma reunião reservada.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_meeting_loan_insert BEFORE INSERT ON public.meeting_admin_items FOR EACH ROW WHEN (NEW.returned_at IS NULL) EXECUTE FUNCTION public.guard_meeting_loan_insert();