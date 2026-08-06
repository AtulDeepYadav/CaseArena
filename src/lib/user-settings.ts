/**
 * user-settings.ts
 * Defaults and toggle definitions for the Settings page (EPIC-02 Account
 * Management). The `user_settings` row is created lazily (upsert on first
 * save) rather than via the signup trigger, so the Settings page always
 * needs a default to fall back to before a row exists.
 */

export type UserSettings = {
  email_notifications: boolean;
  session_reminders: boolean;
  community_activity: boolean;
  product_updates: boolean;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  email_notifications: true,
  session_reminders: true,
  community_activity: true,
  product_updates: true,
};

export type SettingToggle = {
  key: keyof UserSettings;
  label: string;
  description: string;
};

export const SETTINGS_TOGGLES: SettingToggle[] = [
  {
    key: "email_notifications",
    label: "Email notifications",
    description: "Get emailed about important account activity.",
  },
  {
    key: "session_reminders",
    label: "Session reminders",
    description: "Reminders 30 and 5 minutes before a session you're in.",
  },
  {
    key: "community_activity",
    label: "Community activity",
    description: "Likes, comments and ratings on files you've shared.",
  },
  {
    key: "product_updates",
    label: "Product updates",
    description: "Occasional announcements about new CaseArena features.",
  },
];

/** Fills in defaults for any missing keys — a fresh user has no row yet. */
export function mergeUserSettings(row: Partial<UserSettings> | null | undefined): UserSettings {
  if (!row) return { ...DEFAULT_USER_SETTINGS };
  return {
    email_notifications: row.email_notifications ?? DEFAULT_USER_SETTINGS.email_notifications,
    session_reminders: row.session_reminders ?? DEFAULT_USER_SETTINGS.session_reminders,
    community_activity: row.community_activity ?? DEFAULT_USER_SETTINGS.community_activity,
    product_updates: row.product_updates ?? DEFAULT_USER_SETTINGS.product_updates,
  };
}
