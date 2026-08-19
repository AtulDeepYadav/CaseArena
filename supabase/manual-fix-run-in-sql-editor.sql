-- EPIC 2 — one-time manual fix for production
--
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query,
-- and click Run. Safe to run more than once (every statement here is
-- idempotent) — if some of this was already applied, re-running it does
-- nothing to whatever already exists.
--
-- This fixes: avatar upload ("bucket not found"), Settings page (missing
-- user_settings table), duplicate bookmarks, and like/rating/comment counts
-- not updating on the Community Repository.

-- ── Bookmarks: prevent duplicate bookmarks ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_user_file_unique'
  ) THEN
    ALTER TABLE public.bookmarks
      ADD CONSTRAINT bookmarks_user_file_unique UNIQUE (user_id, file_id);
  END IF;
END $$;

-- ── Settings page: user_settings table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
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
DROP POLICY IF EXISTS "own settings" ON public.user_settings;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS user_settings_updated ON public.user_settings;
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Avatar upload: avatars storage bucket ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "own upload avatar" ON storage.objects;
CREATE POLICY "own upload avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own update avatar" ON storage.objects;
CREATE POLICY "own update avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own delete avatar" ON storage.objects;
CREATE POLICY "own delete avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ── Community Repository: like / rating / comment counts ────────────────
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_file_like_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.files SET like_count = like_count + 1 WHERE id = NEW.file_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.files SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.file_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS file_likes_sync_count ON public.file_likes;
CREATE TRIGGER file_likes_sync_count AFTER INSERT OR DELETE ON public.file_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_file_like_count();

CREATE OR REPLACE FUNCTION public.sync_file_comment_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.files SET comment_count = comment_count + 1 WHERE id = NEW.file_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.files SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.file_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS file_comments_sync_count ON public.file_comments;
CREATE TRIGGER file_comments_sync_count AFTER INSERT OR DELETE ON public.file_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_file_comment_count();

CREATE OR REPLACE FUNCTION public.sync_file_rating_stats() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_file_id uuid := COALESCE(NEW.file_id, OLD.file_id);
BEGIN
  UPDATE public.files f
  SET rating_avg = COALESCE((SELECT AVG(rating) FROM public.file_ratings WHERE file_id = target_file_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.file_ratings WHERE file_id = target_file_id)
  WHERE f.id = target_file_id;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS file_ratings_sync_stats ON public.file_ratings;
CREATE TRIGGER file_ratings_sync_stats AFTER INSERT OR UPDATE OR DELETE ON public.file_ratings
  FOR EACH ROW EXECUTE FUNCTION public.sync_file_rating_stats();

-- Backfill: correct any counts that drifted while these triggers didn't exist yet
UPDATE public.files f SET like_count = (SELECT COUNT(*) FROM public.file_likes WHERE file_id = f.id);
UPDATE public.files f SET comment_count = (SELECT COUNT(*) FROM public.file_comments WHERE file_id = f.id);
UPDATE public.files f SET
  rating_avg = COALESCE((SELECT AVG(rating) FROM public.file_ratings WHERE file_id = f.id), 0),
  rating_count = (SELECT COUNT(*) FROM public.file_ratings WHERE file_id = f.id);
