
DROP POLICY "participants write notes" ON public.session_notes;
CREATE POLICY "participants insert notes" ON public.session_notes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.prep_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.session_participants p WHERE p.session_id = session_notes.session_id AND p.user_id = auth.uid() AND p.status = 'booked')
);
CREATE POLICY "participants update notes" ON public.session_notes FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.prep_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.session_participants p WHERE p.session_id = session_notes.session_id AND p.user_id = auth.uid() AND p.status = 'booked')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.prep_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.session_participants p WHERE p.session_id = session_notes.session_id AND p.user_id = auth.uid() AND p.status = 'booked')
);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
