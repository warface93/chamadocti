
DROP POLICY IF EXISTS "Users can view own meetings, admins can view all" ON public.meetings;

CREATE POLICY "Users can view own meetings, admins and active meetings visible to all"
ON public.meetings
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) OR is_admin(auth.uid()) OR (status = 'em_uso')
);
