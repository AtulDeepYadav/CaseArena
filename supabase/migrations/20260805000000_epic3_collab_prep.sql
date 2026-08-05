-- ENUMS for EPIC-03
CREATE TYPE public.collab_session_status_t AS ENUM ('draft','published','live','completed');
CREATE TYPE public.collab_role_t AS ENUM ('host','interviewer','candidate','observer');
CREATE TYPE public.collab_participant_status_t AS ENUM ('invited','accepted','joined');
CREATE TYPE public.collab_event_t AS ENUM ('message','system','ai');

-- COLLAB SESSIONS
CREATE TABLE public.collab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid, -- Reference to cases table if available
  status public.collab_session_status_t NOT NULL DEFAULT 'draft',
  visibility public.session_visibility_t NOT NULL DEFAULT 'public',
  difficulty public.difficulty_t NOT NULL DEFAULT 'medium',
  scheduled_time timestamptz,
  estimated_duration_mins integer DEFAULT 60,
  max_seats integer DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_sessions TO authenticated;
GRANT SELECT ON public.collab_sessions TO anon;
GRANT ALL ON public.collab_sessions TO service_role;
ALTER TABLE public.collab_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions readable" ON public.collab_sessions FOR SELECT USING (true);
CREATE POLICY "own session insert" ON public.collab_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "own session update" ON public.collab_sessions FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE TRIGGER collab_sessions_updated BEFORE UPDATE ON public.collab_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COLLAB PARTICIPANTS
CREATE TABLE public.collab_participants (
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.collab_role_t NOT NULL,
  status public.collab_participant_status_t NOT NULL DEFAULT 'accepted',
  joined_at timestamptz,
  PRIMARY KEY (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_participants TO authenticated;
GRANT ALL ON public.collab_participants TO service_role;
ALTER TABLE public.collab_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants readable" ON public.collab_participants FOR SELECT USING (true);
CREATE POLICY "participants insert" ON public.collab_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM public.collab_sessions WHERE id = session_id));
CREATE POLICY "participants update" ON public.collab_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM public.collab_sessions WHERE id = session_id));
CREATE POLICY "participants delete" ON public.collab_participants FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM public.collab_sessions WHERE id = session_id));

-- COLLAB TRANSCRIPTS (Live Room)
CREATE TABLE public.collab_transcript_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  event_type public.collab_event_t NOT NULL DEFAULT 'message',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.collab_transcript_events TO authenticated;
GRANT ALL ON public.collab_transcript_events TO service_role;
ALTER TABLE public.collab_transcript_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcripts readable by participants" ON public.collab_transcript_events FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM public.collab_participants WHERE session_id = collab_transcript_events.session_id));
CREATE POLICY "transcripts insertable by participants" ON public.collab_transcript_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND auth.uid() IN (SELECT user_id FROM public.collab_participants WHERE session_id = collab_transcript_events.session_id));

-- COLLAB EVALUATIONS (Post-session AI Feedback)
CREATE TABLE public.collab_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_feedback jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collab_evaluations TO authenticated;
GRANT ALL ON public.collab_evaluations TO service_role;
ALTER TABLE public.collab_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluations readable by owner" ON public.collab_evaluations FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No insert policy for authenticated users; Evaluations are generated securely by the backend AI service (service_role).
