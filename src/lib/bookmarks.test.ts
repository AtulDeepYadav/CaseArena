import { describe, it, expect, vi } from "vitest";
import { addBookmark, POSTGRES_UNIQUE_VIOLATION } from "./bookmarks";

function clientReturning(error: { code?: string; message: string } | null) {
  return { from: vi.fn(() => ({ insert: vi.fn(async () => ({ error })) })) };
}

describe("addBookmark", () => {
  it("returns ok + alreadyBookmarked:false on a successful insert", async () => {
    const client = clientReturning(null);
    const result = await addBookmark(client, "user-1", "file-1");
    expect(result).toEqual({ ok: true, alreadyBookmarked: false });
    expect(client.from).toHaveBeenCalledWith("bookmarks");
  });

  it("returns ok + alreadyBookmarked:true on a unique-violation error", async () => {
    const client = clientReturning({ code: POSTGRES_UNIQUE_VIOLATION, message: "duplicate key" });
    const result = await addBookmark(client, "user-1", "file-1");
    expect(result).toEqual({ ok: true, alreadyBookmarked: true });
  });

  it("returns ok:false with the message for any other error", async () => {
    const client = clientReturning({ code: "42501", message: "permission denied" });
    const result = await addBookmark(client, "user-1", "file-1");
    expect(result).toEqual({ ok: false, error: "permission denied" });
  });
});
