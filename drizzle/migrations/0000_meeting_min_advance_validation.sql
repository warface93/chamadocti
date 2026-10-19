CREATE OR REPLACE FUNCTION public.validate_meeting_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  now_recife timestamp := now() AT TIME ZONE 'America/Recife';
  meeting_start timestamp;
BEGIN
  IF NEW.status = 'em_uso' THEN
    IF NEW.meeting_date < now_recife::date THEN
      RAISE EXCEPTION 'Não é possível agendar reuniões em datas passadas.';
    END IF;

    meeting_start := (NEW.meeting_date::text || ' ' || NEW.start_time)::timestamp;
    IF NEW.meeting_date = now_recife::date AND meeting_start < now_recife + interval '10 minutes' THEN
      RAISE EXCEPTION 'As reuniões devem ser solicitadas com pelo menos 10 minutos de antecedência.';
    END IF;

    IF NEW.end_time <= NEW.start_time THEN
      RAISE EXCEPTION 'O horário de término deve ser posterior ao horário de início.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_meeting_schedule
BEFORE INSERT OR UPDATE OF meeting_date, start_time, end_time, status
ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.validate_meeting_schedule();