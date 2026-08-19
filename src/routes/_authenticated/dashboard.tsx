import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Flame,
  Target,
  Trophy,
  BrainCircuit,
  Lock,
  CheckCircle2,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type LeaderboardRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CaseArena" },
      { name: "description", content: "Your consulting prep learning arena." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile } = useAuth();

  const userXP = profile?.xp ?? 0;
  const nextRankXP = 5000;
  const progressPercent = Math.min((userXP / nextRankXP) * 100, 100);
  const currentRank = "Analyst";
  const nextRank = "Associate";

  const { data: topProfiles = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["dashboard-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, xp")
        .order("xp", { ascending: false })
        .limit(3);
      return (data ?? []) as LeaderboardRow[];
    },
  });

  const { data: rank } = useQuery({
    queryKey: ["dashboard-rank", user?.id, userXP],
    enabled: !!user,
    queryFn: async () => {
      const { count: ahead } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("xp", userXP);
      const { count: total } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return { position: (ahead ?? 0) + 1, total: total ?? 1 };
    },
  });

  const quests = [
    {
      id: 1,
      title: "Profitability Basics",
      desc: "Master the fundamental revenue vs. cost tree.",
      status: "completed",
      xp: 500,
    },
    {
      id: 2,
      title: "Market Entry Strategies",
      desc: "Learn how to assess new markets and calculate sizing.",
      status: "active",
      xp: 1000,
    },
    {
      id: 3,
      title: "M&A Synergies",
      desc: "Evaluate mergers, acquisitions, and integration costs.",
      status: "locked",
      xp: 1500,
    },
    {
      id: 4,
      title: "Pricing & Valuation",
      desc: "Determine optimal pricing strategies and ROI.",
      status: "locked",
      xp: 2000,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl pb-16 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader
          title="Learning Arena"
          description="Track your progress, complete quests, and climb the ranks."
        />
        <div className="flex items-center gap-4 bg-background border p-2 rounded-xl">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-lg font-bold">
            <Flame className="h-5 w-5" />
            <span>12 Day Streak!</span>
          </div>
        </div>
      </div>

      {/* Top Section: XP & Rank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-8 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Current Rank
              </div>
              <h2 className="text-3xl font-black">{currentRank}</h2>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Next Rank: {nextRank}
              </div>
              <div className="text-xl font-bold">
                {userXP} <span className="text-muted-foreground text-sm">/ {nextRankXP} XP</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-primary"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {rank
              ? `You're ranked #${rank.position} of ${rank.total} candidates. Keep pushing!`
              : "Keep pushing!"}
          </p>
        </div>

        {/* Leaderboard Snippet */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold flex items-center gap-2 mb-6">
            <Trophy className="h-5 w-5 text-yellow-500" /> Cohort Leaderboard
          </h3>
          <div className="space-y-4">
            {leaderboardLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))
            ) : topProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one on the leaderboard yet.</p>
            ) : (
              topProfiles.map((p, idx) => {
                const isYou = p.id === user?.id;
                const name = isYou ? "You" : (p.full_name ?? "Anonymous");
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border",
                      isYou ? "border-primary bg-primary/5" : "bg-background",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-muted-foreground w-4">{idx + 1}</div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                    <Badge variant="secondary">{p.xp} XP</Badge>
                  </div>
                );
              })
            )}
          </div>
          <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
            <Link to="/leaderboard">
              View Full Rankings <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quest Modules */}
      <div>
        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
          <Target className="h-6 w-6" /> Learning Quests
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quests.map((quest, idx) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 hover-lift",
                quest.status === "locked" ? "bg-muted/30 opacity-70" : "glass",
              )}
            >
              {quest.status === "completed" && (
                <div className="absolute top-4 right-4 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              {quest.status === "locked" && (
                <div className="absolute top-4 right-4 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}

              <div className="mb-4">
                <Badge variant={quest.status === "active" ? "default" : "secondary"}>
                  {quest.xp} XP
                </Badge>
              </div>

              <h4 className="font-bold text-lg mb-2">{quest.title}</h4>
              <p className="text-sm text-muted-foreground mb-6 flex-1">{quest.desc}</p>

              <Button
                variant={quest.status === "active" ? "default" : "outline"}
                disabled={quest.status === "locked"}
                className="w-full"
                asChild={quest.status !== "locked"}
              >
                {quest.status === "locked" ? (
                  <span>Locked</span>
                ) : (
                  <Link to={`/trainer`}>
                    {quest.status === "completed" ? "Review" : "Start Quest"}
                  </Link>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="glass rounded-2xl p-8 flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-full text-primary">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <div>
            <h4 className="font-bold text-lg">AI Mock Interview</h4>
            <p className="text-sm text-muted-foreground mb-3">Practice instantly with Grok.</p>
            <Button asChild>
              <Link to="/trainer">Start Practice</Link>
            </Button>
          </div>
        </div>
        <div className="glass rounded-2xl p-8 flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-full text-primary">
            <BarChart2 className="h-8 w-8" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Group Sessions</h4>
            <p className="text-sm text-muted-foreground mb-3">Join live peer practice rooms.</p>
            <Button asChild variant="secondary">
              <Link to="/sessions">Find Peers</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
