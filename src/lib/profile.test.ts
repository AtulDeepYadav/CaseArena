import { describe, it, expect } from "vitest";
import { Award, Star } from "lucide-react";
import { parseTagList, isValidOptionalUrl, getBadgeIcon, PROFILE_LIMITS } from "./profile";

describe("parseTagList", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseTagList(" Excel ,  SQL,, Valuation ", 10)).toEqual(["Excel", "SQL", "Valuation"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseTagList("", 10)).toEqual([]);
    expect(parseTagList("   ,, ", 10)).toEqual([]);
  });

  it("dedupes case-insensitively, keeping the first occurrence", () => {
    expect(parseTagList("SQL, sql, Sql", 10)).toEqual(["SQL"]);
  });

  it("caps the number of items returned", () => {
    expect(parseTagList("a,b,c,d,e", 3)).toEqual(["a", "b", "c"]);
  });

  it("caps each tag's length", () => {
    const long = "x".repeat(PROFILE_LIMITS.MAX_TAG_LENGTH + 20);
    const [tag] = parseTagList(long, 10);
    expect(tag).toHaveLength(PROFILE_LIMITS.MAX_TAG_LENGTH);
  });
});

describe("isValidOptionalUrl", () => {
  it("accepts an empty string as unset", () => {
    expect(isValidOptionalUrl("")).toBe(true);
    expect(isValidOptionalUrl("   ")).toBe(true);
  });

  it("accepts http and https URLs", () => {
    expect(isValidOptionalUrl("https://linkedin.com/in/someone")).toBe(true);
    expect(isValidOptionalUrl("http://example.com")).toBe(true);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidOptionalUrl("ftp://example.com")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidOptionalUrl("not a url")).toBe(false);
  });

  it("rejects URLs longer than the max length", () => {
    const long = "https://example.com/" + "a".repeat(PROFILE_LIMITS.MAX_LINKEDIN_LENGTH);
    expect(isValidOptionalUrl(long)).toBe(false);
  });
});

describe("getBadgeIcon", () => {
  it("returns the mapped icon for a known key", () => {
    expect(getBadgeIcon("star")).toBe(Star);
  });

  it("falls back to Award for an unknown key", () => {
    expect(getBadgeIcon("not-a-real-icon")).toBe(Award);
  });

  it("falls back to Award for null/undefined", () => {
    expect(getBadgeIcon(null)).toBe(Award);
    expect(getBadgeIcon(undefined)).toBe(Award);
  });
});
