
-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN phone text;

-- Drop the restrictive update policy and create one that allows admins too
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile, admins can update all"
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR is_admin(auth.uid()));
