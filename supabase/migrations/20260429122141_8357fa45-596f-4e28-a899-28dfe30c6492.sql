CREATE OR REPLACE FUNCTION public.get_meeting_user_names()
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.name
  FROM public.profiles p
  INNER JOIN public.meetings m ON m.user_id = p.id
  WHERE m.status = 'em_uso';
$$;

REVOKE EXECUTE ON FUNCTION public.get_meeting_user_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_meeting_user_names() TO authenticated;