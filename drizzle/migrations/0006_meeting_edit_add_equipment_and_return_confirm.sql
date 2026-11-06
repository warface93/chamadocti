DROP POLICY IF EXISTS "Users can delete equipment of own active meetings" ON public.meeting_equipment;
CREATE UNIQUE INDEX IF NOT EXISTS meeting_equipment_unique_item ON public.meeting_equipment (meeting_id, equipment);

CREATE OR REPLACE FUNCTION public.equipment_type_available(_option text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(greatest(e.total_quantity - public.equipment_loaned_qty(e.id), 0)), 0)::integer
  FROM public.equipment_inventory e
  WHERE e.active AND lower(e.type) = CASE _option
    WHEN 'notebook' THEN 'notebook' WHEN 'webcam' THEN 'webcam'
    WHEN 'microfone' THEN 'microfone' WHEN 'caixa_som' THEN 'caixa de som' ELSE NULL END
$$;

-- Adds equipment to an active meeting; never removes previously linked items.
CREATE OR REPLACE FUNCTION public.add_meeting_equipment(_meeting_id uuid, _items text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings%ROWTYPE; it text;
BEGIN
  SELECT * INTO m FROM public.meetings WHERE id = _meeting_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada.'; END IF;
  IF m.user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para editar esta reunião.'; END IF;
  IF m.status <> 'em_uso' THEN RAISE EXCEPTION 'Só é possível acrescentar equipamentos em reuniões reservadas.'; END IF;
  FOREACH it IN ARRAY coalesce(_items, '{}') LOOP
    IF it NOT IN ('notebook','webcam','microfone','caixa_som','link_reuniao') THEN RAISE EXCEPTION 'Equipamento inválido: %', it; END IF;
    IF EXISTS (SELECT 1 FROM public.meeting_equipment WHERE meeting_id = _meeting_id AND equipment = it) THEN
      RAISE EXCEPTION 'Equipamento já vinculado à reunião.'; END IF;
    IF it <> 'link_reuniao' AND public.equipment_type_available(it) < 1 THEN
      RAISE EXCEPTION 'Equipamento indisponível no estoque.'; END IF;
    INSERT INTO public.meeting_equipment (meeting_id, equipment) VALUES (_meeting_id, it);
  END LOOP;
  IF array_length(_items, 1) > 0 THEN
    DELETE FROM public.meeting_equipment WHERE meeting_id = _meeting_id AND equipment = 'sem_equipamentos';
  END IF;
END $$;

-- Atomic confirmation: returns stock and records admin + time.
CREATE OR REPLACE FUNCTION public.confirm_return_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.return_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem confirmar devoluções.'; END IF;
  SELECT * INTO r FROM public.return_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação não encontrada ou já atendida.'; END IF;
  PERFORM public.return_loan_item(r.item_id, r.quantity);
  UPDATE public.return_requests SET status = 'aprovada', admin_id = auth.uid(),
    admin_name = (SELECT name FROM public.profiles WHERE id = auth.uid()), resolved_at = now()
  WHERE id = _request_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.add_meeting_equipment(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_return_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_meeting_equipment(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_return_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equipment_type_available(text) TO authenticated;
ALTER TABLE public.return_requests REPLICA IDENTITY FULL;