DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile, admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR is_admin(auth.uid()));