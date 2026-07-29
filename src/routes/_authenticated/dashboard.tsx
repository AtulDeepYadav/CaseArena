import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Brain,
  Users,
  UploadCloud,
  Gauge,
  CalendarClock,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CaseForge" },
      { name: "description", content: "Your case prep streak, sessions, uploads and AI scores." },
      { property: "og:title", content: "Dashboard — CaseForge" },
      { property: "og:description", content: "Track case practice, sessions and repository activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [attempts, files, participation, activity, upcoming, trending] = await Promise.all([
        supabase.from("ai_attempts").select("id,score,status,created_at,case_title").eq("user_id", uid!).order("created_at", { ascending: false }),
        supabase.from("files").select("id", { count: "exact", head: true }).eq("owner_id", uid!),
        supabase.from("session_participants").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("status", "booked"),
        supabase.from("activity_logs").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(8),
        supabase.from("prep_sessions").select("id,title,category,starts_at").gte("starts_at", nowIso).order("starts_at").limit(5),
        supabase.from("files").select("id,title,like_count,category").eq("visibility", "public").eq("is_trashed", false).order("like_count", { ascending: false }).limit(5),
      ]);
      const evaluated = (attempts.data ?? []).filter((a) => typeof a.score === "number");
      return {
        attempts: attempts.data ?? [],
        solved: evaluated.length,
        avgScore: evaluated.length
          ? Math.round(evaluated.reduce((s, a) => s + (a.score ?? 0), 0) / evaluated.length)
          : 0,
        uploads: files.count ?? 0,
        sessions: participation.count ?? 0,
        activity: activity.data ?? [],
        upcoming: upcoming.data ?? [],
        trending: trending.data ?? [],
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        description="Here's where your preparation stands today."
        action={
          <Button asChild className="bg-gradient-primary">
            <Link to="/trainer">
              <Sparkles className="mr-1 h-4 w-4" /> Start AI case
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Flame} label="Current streak" value={`${profile?.streak ?? 0} d`} index={0} />
          <StatCard icon={Brain} label="Cases solved" value={data?.solved ?? 0} index={1} />
          <StatCard icon={Users} label="Sessions booked" value={data?.sessions ?? 0} index={2} />
          <StatCard icon={UploadCloud} label="Repository uploads" value={data?.uploads ?? 0} index={3} />
          <StatCard icon={Gauge} label="Average AI score" value={data?.avgScore ?? 0} index={4} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl glass p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {(data?.activity ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing yet — generate your first AI case to start the timeline.
              </p>
            )}
            {(data?.activity ?? []).map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-l-2 border-primary/40 pl-3">
                <div>
                  <p className="text-sm font-medium">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl glass p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" /> Upcoming sessions
          </h2>
          <div className="mt-4 space-y-3">
            {(data?.upcoming ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
            )}
            {(data?.upcoming ?? []).map((s) => (
              <Link
                key={s.id}
                to="/sessions/$sessionId"
                params={{ sessionId: s.id }}
                className="block rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent/50"
              >
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.starts_at).toLocaleString()} · {s.category}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl glass p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Trending community uploads
          </h2>
          <div className="mt-4 space-y-2">
            {(data?.trending ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No public uploads yet.</p>
            )}
            {(data?.trending ?? []).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <span className="truncate text-sm">{f.title}</span>
                <Badge variant="secondary">{f.like_count} likes</Badge>
              </div>
            ))}
          </div>
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link to="/community">Browse community</Link>
          </Button>
        </section>

        <section className="rounded-2xl glass p-5">
          <h2 className="text-sm font-semibold">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/trainer"><Brain className="mr-2 h-4 w-4" />Start AI case</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/repository"><UploadCloud className="mr-2 h-4 w-4" />Upload file</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/sessions/host"><Plus className="mr-2 h-4 w-4" />Host session</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/sessions"><Users className="mr-2 h-4 w-4" />Join session</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
