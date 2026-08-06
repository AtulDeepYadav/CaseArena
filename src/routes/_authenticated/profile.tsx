import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, Flame, Trophy, UploadCloud, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PROFILE_LIMITS, parseTagList, isValidOptionalUrl, getBadgeIcon } from "@/lib/profile";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CaseArena" },
      { name: "description", content: "Your CaseArena profile, badges and progress." },
      { property: "og:title", content: "Profile — CaseArena" },
      { property: "og:description", content: "Your CaseArena profile, badges and progress." },
    ],
  }),
  component: ProfilePage,
});

type UserBadgeRow = {
  badge_code: string;
  earned_at: string;
};

type BadgeRow = {
  code: string;
  name: string;
  description: string;
  icon: string;
};

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [batch, setBatch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setBio(profile.bio ?? "");
    setBatch(profile.batch ?? "");
    setSpecialization(profile.specialization ?? "");
    setLinkedinUrl(profile.linkedin_url ?? "");
    setSkillsInput((profile.skills ?? []).join(", "));
    setDomainsInput((profile.preferred_domains ?? []).join(", "));
  }, [profile]);

  const { data: userBadges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badge_code, earned_at")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });
      return (data ?? []) as UserBadgeRow[];
    },
  });

  const badgeCodes = userBadges.map((b) => b.badge_code);

  const { data: badgeDefs = [] } = useQuery({
    queryKey: ["badge-defs", badgeCodes],
    enabled: badgeCodes.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("badges")
        .select("code, name, description, icon")
        .in("code", badgeCodes);
      return (data ?? []) as BadgeRow[];
    },
  });

  const badgeDefMap = new Map(badgeDefs.map((b) => [b.code, b]));
  const badges = userBadges;

  const initials = (fullName || profile?.email || "U").slice(0, 2).toUpperCase();

  const save = async () => {
    if (!user) return;
    if (fullName.trim().length > PROFILE_LIMITS.MAX_FULL_NAME_LENGTH) {
      return toast.error(`Name must be under ${PROFILE_LIMITS.MAX_FULL_NAME_LENGTH} characters`);
    }
    if (!isValidOptionalUrl(linkedinUrl)) {
      return toast.error("LinkedIn URL must be a valid http(s) link");
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim().slice(0, PROFILE_LIMITS.MAX_FULL_NAME_LENGTH) || null,
          bio: bio.trim().slice(0, PROFILE_LIMITS.MAX_BIO_LENGTH) || null,
          batch: batch.trim().slice(0, PROFILE_LIMITS.MAX_BATCH_LENGTH) || null,
          specialization:
            specialization.trim().slice(0, PROFILE_LIMITS.MAX_SPECIALIZATION_LENGTH) || null,
          linkedin_url: linkedinUrl.trim() || null,
          skills: parseTagList(skillsInput, PROFILE_LIMITS.MAX_SKILLS),
          preferred_domains: parseTagList(domainsInput, PROFILE_LIMITS.MAX_PREFERRED_DOMAINS),
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(errorMessage(err, "Could not save profile"));
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Avatar must be an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max avatar size is 5MB");
    setAvatarUploading(true);
    try {
      // Array#pop() on a non-empty array (split always returns >=1 element)
      // can never be undefined; the fallback is unreachable defensive code.
      /* v8 ignore next */
      const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "png"}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(errorMessage(err, "Avatar upload failed"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadResume = async (file: File) => {
    if (!user) return;
    if (file.type !== "application/pdf") return toast.error("Resume must be a PDF");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max resume size is 10MB");
    setResumeUploading(true);
    try {
      const path = `${user.id}/resume-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("repository")
        .upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { error } = await supabase
        .from("profiles")
        .update({ resume_url: path })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast.success("Resume updated");
    } catch (err) {
      toast.error(errorMessage(err, "Resume upload failed"));
    } finally {
      setResumeUploading(false);
    }
  };

  // Only reachable via the "View" button below, which is disabled unless
  // profile.resume_url is set — so resume_url is guaranteed here.
  const viewResume = async () => {
    const { data, error } = await supabase.storage
      .from("repository")
      .createSignedUrl(profile!.resume_url!, 60);
    if (error || !data) return toast.error(error?.message ?? "Could not open resume");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Profile" description="Your CaseArena profile, badges and progress." />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Profile" description="Your CaseArena profile, badges and progress." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Sparkles} label="XP" value={profile.xp} index={0} />
        <StatCard icon={Flame} label="Streak" value={`${profile.streak} days`} index={1} />
        <StatCard icon={Trophy} label="Badges" value={badges.length} index={2} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl glass p-4 text-center">
          <Avatar className="mx-auto h-24 w-24">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
            {avatarUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Change photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={avatarUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.target.value = "";
              }}
            />
          </label>

          <div className="mt-4 border-t border-border/60 pt-4 text-left">
            <Label className="text-xs">Resume</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={viewResume}
                disabled={!profile.resume_url}
              >
                <FileText className="mr-1 h-4 w-4" /> View
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary">
                {resumeUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Upload PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={resumeUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadResume(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl glass p-4">
            <h2 className="text-sm font-semibold">About</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-full-name">Full name</Label>
                <Input
                  id="profile-full-name"
                  value={fullName}
                  maxLength={PROFILE_LIMITS.MAX_FULL_NAME_LENGTH}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-batch">Batch</Label>
                <Input
                  id="profile-batch"
                  value={batch}
                  maxLength={PROFILE_LIMITS.MAX_BATCH_LENGTH}
                  onChange={(e) => setBatch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-specialization">Specialization</Label>
                <Input
                  id="profile-specialization"
                  value={specialization}
                  maxLength={PROFILE_LIMITS.MAX_SPECIALIZATION_LENGTH}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-linkedin">LinkedIn URL</Label>
                <Input
                  id="profile-linkedin"
                  value={linkedinUrl}
                  maxLength={PROFILE_LIMITS.MAX_LINKEDIN_LENGTH}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  value={bio}
                  maxLength={PROFILE_LIMITS.MAX_BIO_LENGTH}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-skills">Skills (comma separated)</Label>
                <Input
                  id="profile-skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Excel, Valuation, SQL"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-domains">Preferred domains (comma separated)</Label>
                <Input
                  id="profile-domains"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  placeholder="Consulting, Product"
                />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="mt-4 bg-gradient-primary">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save profile
            </Button>
          </div>

          <div className="rounded-2xl glass p-4">
            <h2 className="text-sm font-semibold">Badges</h2>
            {badgesLoading ? (
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-16 rounded-xl" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No badges earned yet. Keep solving cases and joining sessions to unlock them.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {badges.map((b) => {
                  const def = badgeDefMap.get(b.badge_code);
                  const Icon = getBadgeIcon(def?.icon);
                  return (
                    <div
                      key={b.badge_code}
                      className="flex w-20 flex-col items-center gap-1 text-center"
                      title={def?.description}
                    >
                      <div className="rounded-full bg-primary/10 p-3">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {def?.name ?? b.badge_code}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(profile.skills?.length ?? 0) > 0 && (
            <div className="rounded-2xl glass p-4">
              <h2 className="text-sm font-semibold">Skills</h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.skills.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
