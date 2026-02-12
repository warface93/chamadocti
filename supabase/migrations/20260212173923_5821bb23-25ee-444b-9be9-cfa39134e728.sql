
CREATE OR REPLACE FUNCTION public.check_has_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);
$$;

-- Allow anon to call this function
GRANT EXECUTE ON FUNCTION public.check_has_users() TO anon;
GRANT EXECUTE ON FUNCTION public.check_has_users() TO authenticated;
