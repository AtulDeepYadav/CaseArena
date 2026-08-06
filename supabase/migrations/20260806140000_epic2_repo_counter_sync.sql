
-- EPIC 2 bugfix: files.like_count / rating_avg / rating_count were never
-- kept in sync with file_likes / file_ratings (no trigger existed), and
-- there was no denormalized comment count at all for the "Discuss (N)" UI.

-- COMMENT COUNT
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- LIKE COUNT SYNC
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

-- COMMENT COUNT SYNC
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

-- RATING AVG/COUNT SYNC (recomputed from source of truth so upserts/edits/deletes all self-correct)
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

-- BACKFILL: correct any counts that drifted before these triggers existed
UPDATE public.files f SET like_count = (SELECT COUNT(*) FROM public.file_likes WHERE file_id = f.id);
UPDATE public.files f SET comment_count = (SELECT COUNT(*) FROM public.file_comments WHERE file_id = f.id);
UPDATE public.files f SET
  rating_avg = COALESCE((SELECT AVG(rating) FROM public.file_ratings WHERE file_id = f.id), 0),
  rating_count = (SELECT COUNT(*) FROM public.file_ratings WHERE file_id = f.id);
