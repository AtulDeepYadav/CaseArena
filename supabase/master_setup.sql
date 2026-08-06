
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student','admin');
CREATE TYPE public.visibility_t AS ENUM ('private','public','shared');
CREATE TYPE public.session_visibility_t AS ENUM ('public','invite','private');
CREATE TYPE public.difficulty_t AS ENUM ('easy','medium','hard');
CREATE TYPE public.attempt_status_t AS ENUM ('in_progress','submitted','evaluated');
CREATE TYPE public.participant_status_t AS ENUM ('booked','waitlist','cancelled');

-- UTIL
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  batch text,
  specialization text,
  linkedin_url text,
  resume_url text,
  skills text[] NOT NULL DEFAULT '{}',
  preferred_domains text[] NOT NULL DEFAULT '{}',
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins manage profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AI ATTEMPTS
CREATE TABLE public.ai_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  case_type text,
  interview_type text,
  difficulty public.difficulty_t NOT NULL DEFAULT 'medium',
  duration_minutes integer NOT NULL DEFAULT 30,
  case_title text NOT NULL,
  case_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  answer text,
  status public.attempt_status_t NOT NULL DEFAULT 'in_progress',
  score integer,
  feedback jsonb,
  time_taken_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_attempts TO authenticated;
GRANT ALL ON public.ai_attempts TO service_role;
ALTER TABLE public.ai_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.ai_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_attempts_updated BEFORE UPDATE ON public.ai_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FOLDERS
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON public.folders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FILES
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  company text,
  topic text,
  category text,
  framework text,
  difficulty public.difficulty_t,
  interview_round text,
  tags text[] NOT NULL DEFAULT '{}',
  visibility public.visibility_t NOT NULL DEFAULT 'private',
  storage_path text,
  file_name text,
  file_type text,
  size_bytes bigint,
  download_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  is_trashed boolean NOT NULL DEFAULT false,
  is_removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own files" ON public.files FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "public files readable" ON public.files FOR SELECT TO authenticated USING (visibility <> 'private' AND is_trashed = false AND is_removed = false);
CREATE POLICY "admins moderate files" ON public.files FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read files" ON public.files FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER files_updated BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LIKES
CREATE TABLE public.file_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.file_likes TO authenticated;
GRANT ALL ON public.file_likes TO service_role;
ALTER TABLE public.file_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.file_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "own likes write" ON public.file_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own likes delete" ON public.file_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RATINGS
CREATE TABLE public.file_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_ratings TO authenticated;
GRANT ALL ON public.file_ratings TO service_role;
ALTER TABLE public.file_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable" ON public.file_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own ratings" ON public.file_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COMMENTS
CREATE TABLE public.file_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_comments TO authenticated;
GRANT ALL ON public.file_comments TO service_role;
ALTER TABLE public.file_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.file_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "own comments" ON public.file_comments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins delete comments" ON public.file_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- BOOKMARKS
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.ai_attempts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports readable" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SESSIONS
CREATE TABLE public.prep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  capacity integer NOT NULL DEFAULT 8,
  meeting_link text,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  prerequisites text,
  visibility public.session_visibility_t NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prep_sessions TO authenticated;
GRANT ALL ON public.prep_sessions TO service_role;
ALTER TABLE public.prep_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions readable" ON public.prep_sessions FOR SELECT TO authenticated USING (visibility <> 'private' OR auth.uid() = host_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "host manages session" ON public.prep_sessions FOR ALL TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE TRIGGER prep_sessions_updated BEFORE UPDATE ON public.prep_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.prep_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.participant_status_t NOT NULL DEFAULT 'booked',
  hand_raised boolean NOT NULL DEFAULT false,
  feedback text,
  rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_participants TO authenticated;
GRANT ALL ON public.session_participants TO service_role;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants readable" ON public.session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "own participation" ON public.session_participants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.prep_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_messages TO authenticated;
GRANT ALL ON public.session_messages TO service_role;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable" ON public.session_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "own messages" ON public.session_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.session_notes (
  session_id uuid PRIMARY KEY REFERENCES public.prep_sessions(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.session_notes TO authenticated;
GRANT ALL ON public.session_notes TO service_role;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes readable" ON public.session_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "participants write notes" ON public.session_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BADGES
CREATE TABLE public.badges (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award'
);
GRANT SELECT ON public.badges TO authenticated, anon;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_code text NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user badges readable" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "own badges insert" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ACTIVITY
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity readable" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own activity insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SEED BADGES
INSERT INTO public.badges (code, name, description, icon) VALUES
 ('century','100 Cases Solved','Solved 100 AI practice cases','trophy'),
 ('top_mentor','Top Mentor','Hosted 10+ group sessions','users'),
 ('repo_star','Repository Star','Uploads liked 50+ times','star'),
 ('early_bird','Early Bird','Joined a session before 8 AM','sunrise'),
 ('streak','Consistency Streak','7-day practice streak','flame'),
 ('weekly_champ','Weekly Champion','Topped the weekly leaderboard','crown');

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

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

CREATE POLICY "own upload repo" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read repo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repository');
CREATE POLICY "own update repo" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own delete repo" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'repository' AND (storage.foldername(name))[1] = auth.uid()::text);
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


ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_transcript_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_sessions;

-- EPIC 2: bookmarks dedup fix
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_file_unique UNIQUE (user_id, file_id);

-- EPIC 2: USER SETTINGS
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  email_notifications boolean NOT NULL DEFAULT true,
  session_reminders boolean NOT NULL DEFAULT true,
  community_activity boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EPIC 2: AVATARS STORAGE BUCKET (public, for stable profile.avatar_url)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own upload avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own update avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own delete avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
