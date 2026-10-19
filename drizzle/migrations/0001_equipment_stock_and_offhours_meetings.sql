-- Meetings: off-hours justification
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS off_hours_justification text;

CREATE OR REPLACE FUNCTION public.validate_meeting_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

    IF NEW.start_time < '07:30' OR NEW.end_time > '17:00' THEN
      IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Horário deve estar entre 07:30 e 17:00.';
      END IF;
      IF NEW.off_hours_justification IS NULL OR length(trim(NEW.off_hours_justification)) = 0 THEN
        RAISE EXCEPTION 'Informe a justificativa para agendamento fora do horário padrão.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_meeting_schedule ON public.meetings;
CREATE TRIGGER trg_validate_meeting_schedule
BEFORE INSERT OR UPDATE OF meeting_date, start_time, end_time, status, off_hours_justification
ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.validate_meeting_schedule();

-- Equipment stock
ALTER TABLE public.equipment_inventory ADD COLUMN IF NOT EXISTS total_quantity integer NOT NULL DEFAULT 1;
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_total_quantity_positive CHECK (total_quantity > 0);
ALTER TABLE public.meeting_admin_items ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.equipment_inventory(id) ON DELETE SET NULL;
ALTER TABLE public.meeting_admin_items ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE public.meeting_admin_items ADD COLUMN IF NOT EXISTS loaned_at timestamptz NOT NULL DEFAULT now();

-- normalize empty tombamento
UPDATE public.equipment_inventory SET tombamento = NULL WHERE tombamento IS NOT NULL AND trim(tombamento) = '';

-- link existing loans
UPDATE public.meeting_admin_items mai SET equipment_id = ei.id
FROM public.equipment_inventory ei
WHERE ei.current_meeting_id = mai.meeting_id AND mai.equipment_id IS NULL
  AND mai.description = ei.type || ' - ' || ei.brand
  AND coalesce(mai.tombamento,'') = coalesce(ei.tombamento,'');

-- merge duplicate untagged groups
WITH g AS (
  SELECT id, first_value(id) OVER (PARTITION BY lower(trim(type)), lower(trim(brand)) ORDER BY created_at, id) AS keeper,
         count(*) OVER (PARTITION BY lower(trim(type)), lower(trim(brand))) AS cnt
  FROM public.equipment_inventory WHERE tombamento IS NULL AND active
)
UPDATE public.meeting_admin_items mai SET equipment_id = g.keeper FROM g WHERE mai.equipment_id = g.id AND g.id <> g.keeper;

WITH g AS (
  SELECT id, first_value(id) OVER (PARTITION BY lower(trim(type)), lower(trim(brand)) ORDER BY created_at, id) AS keeper,
         sum(total_quantity) OVER (PARTITION BY lower(trim(type)), lower(trim(brand))) AS cnt
  FROM public.equipment_inventory WHERE tombamento IS NULL AND active
)
UPDATE public.equipment_inventory ei SET
  total_quantity = CASE WHEN ei.id = g.keeper THEN g.cnt ELSE ei.total_quantity END,
  active = (ei.id = g.keeper)
FROM g WHERE ei.id = g.id;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_untagged_group_unique
ON public.equipment_inventory (lower(trim(type)), lower(trim(brand)))
WHERE tombamento IS NULL AND active;

-- loaned quantity helper
CREATE OR REPLACE FUNCTION public.equipment_loaned_qty(_equipment_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(quantity),0)::int FROM public.meeting_admin_items
  WHERE equipment_id = _equipment_id AND returned_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.refresh_equipment_status(_equipment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  loaned int; total int; last_meeting uuid;
BEGIN
  IF _equipment_id IS NULL THEN RETURN; END IF;
  SELECT total_quantity INTO total FROM public.equipment_inventory WHERE id = _equipment_id;
  IF total IS NULL THEN RETURN; END IF;
  loaned := public.equipment_loaned_qty(_equipment_id);
  SELECT meeting_id INTO last_meeting FROM public.meeting_admin_items
    WHERE equipment_id = _equipment_id AND returned_at IS NULL ORDER BY loaned_at DESC LIMIT 1;
  UPDATE public.equipment_inventory SET
    status = CASE WHEN loaned = 0 THEN 'disponivel' WHEN loaned >= total THEN 'em_emprestimo' ELSE 'parcial' END,
    current_meeting_id = last_meeting,
    updated_at = now()
  WHERE id = _equipment_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_admin_items_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.refresh_equipment_status(OLD.equipment_id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.refresh_equipment_status(NEW.equipment_id); END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER admin_items_refresh_equipment
AFTER INSERT OR UPDATE OR DELETE ON public.meeting_admin_items
FOR EACH ROW EXECUTE FUNCTION public.trg_admin_items_refresh();

-- protect stock integrity on inventory
CREATE OR REPLACE FUNCTION public.validate_equipment_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE loaned int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.equipment_loaned_qty(OLD.id) > 0 THEN
      RAISE EXCEPTION 'Não é possível excluir: há unidades emprestadas deste equipamento.';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.tombamento IS NOT NULL AND trim(NEW.tombamento) = '' THEN NEW.tombamento := NULL; END IF;
  IF NEW.tombamento IS NOT NULL AND NEW.total_quantity <> 1 THEN
    RAISE EXCEPTION 'Equipamentos com tombamento devem ter quantidade 1.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    loaned := public.equipment_loaned_qty(NEW.id);
    IF NEW.total_quantity < loaned THEN
      RAISE EXCEPTION 'A quantidade total não pode ser menor que as % unidade(s) emprestada(s).', loaned;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_equipment_inventory_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.equipment_inventory
FOR EACH ROW EXECUTE FUNCTION public.validate_equipment_inventory();

-- atomic loan
CREATE OR REPLACE FUNCTION public.loan_equipment(_meeting_id uuid, _equipment_id uuid, _quantity integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eq public.equipment_inventory%ROWTYPE; loaned int; new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem emprestar equipamentos.'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  SELECT * INTO eq FROM public.equipment_inventory WHERE id = _equipment_id AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento não encontrado.'; END IF;
  IF eq.tombamento IS NOT NULL AND _quantity <> 1 THEN RAISE EXCEPTION 'Equipamento tombado: empreste 1 unidade por vez.'; END IF;
  loaned := public.equipment_loaned_qty(_equipment_id);
  IF eq.total_quantity - loaned < _quantity THEN
    RAISE EXCEPTION 'Quantidade indisponível. Disponível: %.', eq.total_quantity - loaned;
  END IF;
  INSERT INTO public.meeting_admin_items (meeting_id, description, quantity, tombamento, equipment_id)
  VALUES (_meeting_id, eq.type || ' - ' || eq.brand, _quantity, eq.tombamento, _equipment_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- return (partial or full) of one loan record
CREATE OR REPLACE FUNCTION public.return_loan_item(_item_id uuid, _quantity integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.meeting_admin_items%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem registrar devoluções.'; END IF;
  SELECT * INTO it FROM public.meeting_admin_items WHERE id = _item_id AND returned_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado ou já devolvido.'; END IF;
  IF _quantity IS NULL OR _quantity >= it.quantity THEN
    UPDATE public.meeting_admin_items SET returned_at = now() WHERE id = _item_id;
  ELSE
    IF _quantity < 1 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    UPDATE public.meeting_admin_items SET quantity = quantity - _quantity WHERE id = _item_id;
    INSERT INTO public.meeting_admin_items (meeting_id, description, quantity, tombamento, equipment_id, loaned_at, returned_at)
    VALUES (it.meeting_id, it.description, _quantity, it.tombamento, it.equipment_id, it.loaned_at, now());
  END IF;
END $$;

-- returning meeting releases all its loans
CREATE OR REPLACE FUNCTION public.trg_meeting_returned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'devolvido' AND OLD.status IS DISTINCT FROM 'devolvido' THEN
    UPDATE public.meeting_admin_items SET returned_at = now()
    WHERE meeting_id = NEW.id AND returned_at IS NULL;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER meeting_returned_release_equipment
AFTER UPDATE OF status ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.trg_meeting_returned();

REVOKE EXECUTE ON FUNCTION public.loan_equipment(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.return_loan_item(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.loan_equipment(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_loan_item(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equipment_loaned_qty(uuid) TO authenticated;