CREATE OR REPLACE FUNCTION public.equipment_type_available(_option text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT coalesce(sum(greatest(e.total_quantity - public.equipment_loaned_qty(e.id), 0)), 0)::integer
 FROM public.equipment_inventory e WHERE e.active AND lower(trim(e.type)) = CASE _option
 WHEN 'notebook' THEN 'notebook' WHEN 'webcam' THEN 'webcam' WHEN 'microfone' THEN 'microfone'
 WHEN 'caixa_som' THEN 'caixa de som' WHEN 'fone_headset' THEN 'fone headset'
 WHEN 'caixinha_som' THEN 'caixinha de som' WHEN 'passador_slider' THEN 'passador slider' ELSE NULL END
$$;
CREATE OR REPLACE FUNCTION public.add_meeting_equipment(_meeting_id uuid, _items text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE m public.meetings%ROWTYPE; it text;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id = _meeting_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada.'; END IF;
 IF auth.uid() IS NULL OR (m.user_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Sem permissão para editar esta reunião.'; END IF;
 IF m.status <> 'em_uso' THEN RAISE EXCEPTION 'Só é possível acrescentar equipamentos em reuniões reservadas.'; END IF;
 FOREACH it IN ARRAY coalesce(_items, '{}') LOOP
  IF it NOT IN ('notebook','webcam','microfone','caixa_som','link_reuniao','fone_headset','caixinha_som','passador_slider') THEN RAISE EXCEPTION 'Equipamento inválido: %', it; END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_equipment WHERE meeting_id = _meeting_id AND equipment = it) THEN RAISE EXCEPTION 'Equipamento já vinculado à reunião.'; END IF;
  IF it <> 'link_reuniao' AND public.equipment_type_available(it) < 1 THEN RAISE EXCEPTION 'Equipamento indisponível no estoque.'; END IF;
  INSERT INTO public.meeting_equipment (meeting_id, equipment) VALUES (_meeting_id, it);
 END LOOP;
 IF array_length(_items, 1) > 0 THEN DELETE FROM public.meeting_equipment WHERE meeting_id = _meeting_id AND equipment = 'sem_equipamentos'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.equipment_type_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipment_type_available(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_meeting_equipment(uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_meeting_equipment(uuid,text[]) TO authenticated, service_role;