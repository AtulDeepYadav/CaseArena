
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
