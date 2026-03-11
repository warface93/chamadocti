
-- Allow users to update their own meetings (for edit and finalize)
DROP POLICY IF EXISTS "Admins can update meetings" ON public.meetings;
CREATE POLICY "Users can update own meetings, admins can update all"
ON public.meetings
FOR UPDATE
TO public
USING (user_id = auth.uid() OR is_admin(auth.uid()));
