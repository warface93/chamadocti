CREATE OR REPLACE FUNCTION public.return_loan_item(_item_id uuid, _quantity integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.meeting_admin_items%ROWTYPE; meeting_uuid uuid; equipment_uuid uuid; qty integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem registrar devoluções.'; END IF;
  SELECT meeting_id, equipment_id INTO meeting_uuid, equipment_uuid FROM public.meeting_admin_items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado.'; END IF;
  PERFORM 1 FROM public.meetings WHERE id = meeting_uuid FOR UPDATE;
  IF equipment_uuid IS NOT NULL THEN PERFORM 1 FROM public.equipment_inventory WHERE id = equipment_uuid FOR UPDATE; END IF;
  SELECT * INTO it FROM public.meeting_admin_items WHERE id = _item_id AND returned_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado ou já devolvido.'; END IF;
  qty := coalesce(_quantity, it.quantity);
  IF qty < 1 OR qty > it.quantity THEN RAISE EXCEPTION 'Quantidade inválida: informe de 1 a % unidade(s).', it.quantity; END IF;
  IF qty = it.quantity THEN
    UPDATE public.meeting_admin_items SET returned_at = now() WHERE id = _item_id;
  ELSE
    UPDATE public.meeting_admin_items SET quantity = quantity - qty WHERE id = _item_id;
    INSERT INTO public.meeting_admin_items (meeting_id, description, quantity, tombamento, equipment_id, loaned_at, returned_at)
    VALUES (it.meeting_id, it.description, qty, it.tombamento, it.equipment_id, it.loaned_at, now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.meeting_admin_items WHERE meeting_id = it.meeting_id AND returned_at IS NULL) THEN
    UPDATE public.meetings SET status = 'devolvido' WHERE id = it.meeting_id AND status = 'finalizado';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.return_loan_item(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_loan_item(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.loan_equipment(_meeting_id uuid, _equipment_id uuid, _quantity integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eq public.equipment_inventory%ROWTYPE; loaned integer; new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas administradores podem emprestar equipamentos.'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  PERFORM 1 FROM public.meetings WHERE id = _meeting_id AND status = 'em_uso' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Só é possível emprestar para uma reunião em uso.'; END IF;
  SELECT * INTO eq FROM public.equipment_inventory WHERE id = _equipment_id AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento não encontrado.'; END IF;
  IF eq.tombamento IS NOT NULL AND _quantity <> 1 THEN RAISE EXCEPTION 'Equipamento tombado: empreste 1 unidade por vez.'; END IF;
  loaned := public.equipment_loaned_qty(_equipment_id);
  IF eq.total_quantity - loaned < _quantity THEN RAISE EXCEPTION 'Quantidade indisponível. Disponível: %.', eq.total_quantity - loaned; END IF;
  INSERT INTO public.meeting_admin_items (meeting_id, description, quantity, tombamento, equipment_id)
  VALUES (_meeting_id, eq.type || ' - ' || eq.brand, _quantity, eq.tombamento, _equipment_id) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.loan_equipment(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.loan_equipment(uuid, uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_meeting_equipment_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'devolvido' AND OLD.status IS DISTINCT FROM 'devolvido'
    AND NOT public.is_admin(auth.uid())
    AND EXISTS (SELECT 1 FROM public.meeting_admin_items WHERE meeting_id = NEW.id AND returned_at IS NULL)
  THEN RAISE EXCEPTION 'Há equipamentos emprestados. Aguarde a confirmação de devolução pelo administrador.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_meeting_equipment_return BEFORE UPDATE OF status ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.guard_meeting_equipment_return();