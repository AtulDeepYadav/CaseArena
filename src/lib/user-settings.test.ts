import { describe, it, expect } from "vitest";
import { mergeUserSettings, DEFAULT_USER_SETTINGS, SETTINGS_TOGGLES } from "./user-settings";

describe("mergeUserSettings", () => {
  it("returns all defaults when given null", () => {
    expect(mergeUserSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("returns all defaults when given undefined", () => {
    expect(mergeUserSettings(undefined)).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("preserves every field from a fully-populated row", () => {
    const row = {
      email_notifications: false,
      session_reminders: false,
      community_activity: false,
      product_updates: false,
    };
    expect(mergeUserSettings(row)).toEqual(row);
  });

  it("fills in defaults for missing fields on a partial row", () => {
    expect(mergeUserSettings({ email_notifications: false })).toEqual({
      ...DEFAULT_USER_SETTINGS,
      email_notifications: false,
    });
  });

  it("falls back to the default when email_notifications itself is missing", () => {
    expect(mergeUserSettings({ session_reminders: false })).toEqual({
      ...DEFAULT_USER_SETTINGS,
      session_reminders: false,
    });
  });
});

describe("SETTINGS_TOGGLES", () => {
  it("defines a toggle entry for every DEFAULT_USER_SETTINGS key", () => {
    const keys = SETTINGS_TOGGLES.map((t) => t.key).sort();
    expect(keys).toEqual(Object.keys(DEFAULT_USER_SETTINGS).sort());
  });
});
