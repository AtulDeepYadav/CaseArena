/**
 * profile.ts
 * Pure helpers for the Profile page (EPIC-02 Account Management): tag-list
 * parsing for skills/preferred domains, and badge icon lookup.
 */
import { Award, Star, Flame, Trophy, Sunrise, Medal, type LucideIcon } from "lucide-react";

export const PROFILE_LIMITS = {
  MAX_SKILLS: 15,
  MAX_PREFERRED_DOMAINS: 10,
  MAX_TAG_LENGTH: 40,
  MAX_BIO_LENGTH: 1000,
  MAX_FULL_NAME_LENGTH: 120,
  MAX_BATCH_LENGTH: 40,
  MAX_SPECIALIZATION_LENGTH: 60,
  MAX_LINKEDIN_LENGTH: 300,
} as const;

/**
 * Splits a comma-separated string into a deduped, length-capped list of
 * trimmed tags, mirroring the tag-parsing already used for file uploads in
 * repository.tsx (split on comma, trim, drop empties, cap count).
 */
export function parseTagList(input: string, maxItems: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim().slice(0, PROFILE_LIMITS.MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= maxItems) break;
  }
  return result;
}

/** Empty string is a valid ("not set") value; anything non-empty must be an http(s) URL. */
export function isValidOptionalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (trimmed.length > PROFILE_LIMITS.MAX_LINKEDIN_LENGTH) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  award: Award,
  star: Star,
  flame: Flame,
  trophy: Trophy,
  sunrise: Sunrise,
  medal: Medal,
};

export function getBadgeIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return Award;
  return BADGE_ICONS[icon] ?? Award;
}
