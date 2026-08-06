/**
 * bookmarks.ts
 * Shared bookmark-creation logic for EPIC-02 Account Management / Case Repository.
 * The `bookmarks` table has a unique (user_id, file_id) constraint — this
 * turns the resulting Postgres unique-violation into a clean, testable result
 * instead of a raw error string, and used by both the Community page and the
 * Bookmarks page.
 */

export const POSTGRES_UNIQUE_VIOLATION = "23505";

export type BookmarkResult =
  | { ok: true; alreadyBookmarked: false }
  | { ok: true; alreadyBookmarked: true }
  | { ok: false; error: string };

type BookmarkableClient = {
  from: (table: "bookmarks") => {
    insert: (row: { user_id: string; file_id: string }) => PromiseLike<{
      error: { code?: string; message: string } | null;
    }>;
  };
};

export async function addBookmark(
  client: BookmarkableClient,
  userId: string,
  fileId: string,
): Promise<BookmarkResult> {
  const { error } = await client.from("bookmarks").insert({ user_id: userId, file_id: fileId });
  if (!error) return { ok: true, alreadyBookmarked: false };
  if (error.code === POSTGRES_UNIQUE_VIOLATION) return { ok: true, alreadyBookmarked: true };
  return { ok: false, error: error.message };
}
