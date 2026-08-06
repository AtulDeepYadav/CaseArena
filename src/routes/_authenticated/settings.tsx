import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Moon, Sun, KeyRound, Mail, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme";
import {
  DEFAULT_USER_SETTINGS,
  SETTINGS_TOGGLES,
  mergeUserSettings,
  type UserSettings,
} from "@/lib/user-settings";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CaseArena" },
      { name: "description", content: "Manage account preferences and notifications." },
      { property: "og:title", content: "Settings — CaseArena" },
      { property: "og:description", content: "Manage account preferences and notifications." },
    ],
  }),
  component: SettingsPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export function SettingsPage() {
  const { user, profile } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const { data: settingsRow, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("email_notifications, session_reminders, community_activity, product_updates")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as Partial<UserSettings> | null;
    },
  });

  useEffect(() => {
    setSettings(mergeUserSettings(settingsRow));
  }, [settingsRow]);

  useEffect(() => {
    if (profile?.email) setNewEmail(profile.email);
  }, [profile?.email]);

  const saveSettings = async (next: UserSettings) => {
    if (!user) return;
    setSettings(next);
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      qc.invalidateQueries({ queryKey: ["user-settings", user.id] });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save settings"));
    } finally {
      setSavingSettings(false);
    }
  };

  const changeEmail = async () => {
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: parsed.data });
      if (error) throw new Error(error.message);
      toast.success("Check your inbox to confirm the new email address");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update email"));
    } finally {
      setEmailBusy(false);
    }
  };

  const changePassword = async () => {
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw new Error(error.message);
      toast.success("Password updated");
      setNewPassword("");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update password"));
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" description="Manage account preferences and notifications." />

      <div className="rounded-2xl glass p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        {isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border/60">
            {SETTINGS_TOGGLES.map((toggleDef) => (
              <div key={toggleDef.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{toggleDef.label}</p>
                  <p className="text-xs text-muted-foreground">{toggleDef.description}</p>
                </div>
                <Switch
                  checked={settings[toggleDef.key]}
                  disabled={savingSettings}
                  onCheckedChange={(checked) =>
                    void saveSettings({ ...settings, [toggleDef.key]: checked })
                  }
                  aria-label={toggleDef.label}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl glass p-4">
        <div className="flex items-center gap-2">
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-primary" />
          ) : (
            <Sun className="h-4 w-4 text-primary" />
          )}
          <h2 className="text-sm font-semibold">Appearance</h2>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Dark mode</p>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} aria-label="Dark mode" />
        </div>
      </div>

      <div className="rounded-2xl glass p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Email address</h2>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
            aria-label="New email address"
            className="sm:max-w-sm"
          />
          <Button onClick={changeEmail} disabled={emailBusy} variant="outline">
            {emailBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update email
          </Button>
        </div>
      </div>

      <div className="rounded-2xl glass p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Password</h2>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            aria-label="New password"
            className="sm:max-w-sm"
          />
          <Button onClick={changePassword} disabled={passwordBusy} variant="outline">
            {passwordBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
          </Button>
        </div>
      </div>
    </div>
  );
}
