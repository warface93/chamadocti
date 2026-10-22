CREATE OR REPLACE FUNCTION public.validate_meeting_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  now_recife timestamp := now() AT TIME ZONE 'America/Recife';
  meeting_start timestamp;
  is_exceptional boolean := false;
BEGIN
  IF NEW.status = 'em_uso' THEN
    IF NEW.meeting_date < now_recife::date THEN
      RAISE EXCEPTION 'Não é possível agendar reuniões em datas passadas.';
    END IF;

    meeting_start := (NEW.meeting_date::text || ' ' || NEW.start_time)::timestamp;

    -- Horário de início já passado: bloqueado para todos
    IF NEW.meeting_date = now_recife::date AND meeting_start < now_recife THEN
      RAISE EXCEPTION 'Não é possível selecionar um horário que já passou.';
    END IF;

    IF NEW.end_time <= NEW.start_time THEN
      RAISE EXCEPTION 'O horário de término deve ser posterior ao horário de início.';
    END IF;

    -- Agendamento excepcional: fora de 07:30-17:00 OU menos de 10 min de antecedência
    IF NEW.start_time < '07:30' OR NEW.end_time > '17:00' THEN
      is_exceptional := true;
    END IF;
    IF NEW.meeting_date = now_recife::date AND meeting_start < now_recife + interval '10 minutes' THEN
      is_exceptional := true;
    END IF;

    IF is_exceptional THEN
      IF NOT public.is_admin(auth.uid()) THEN
        IF NEW.start_time < '07:30' OR NEW.end_time > '17:00' THEN
          RAISE EXCEPTION 'Horário deve estar entre 07:30 e 17:00.';
        ELSE
          RAISE EXCEPTION 'As reuniões devem ser solicitadas com pelo menos 10 minutos de antecedência.';
        END IF;
      END IF;
      IF NEW.off_hours_justification IS NULL OR length(trim(NEW.off_hours_justification)) = 0 THEN
        RAISE EXCEPTION 'Informe a justificativa para agendamento excepcional.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;