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
    <div className="mx-auto max-w-6xl h-[calc(100vh-6rem)] flex flex-col space-y-6 pb-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <PageHeader
          title="Learning Arena"
          description="Track your progress, complete quests, and climb the ranks."
        />
        <div className="flex items-center gap-4 bg-background/50 border p-1.5 rounded-xl shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-600 rounded-lg font-bold text-sm">
            <Flame className="h-4 w-4" />
            <span>12 Day Streak!</span>
          </div>
        </div>
      </div>

      {/* Top Section: XP & Rank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        <div className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 flex justify-between items-end mb-4">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Current Rank
              </div>
              <h2 className="text-3xl font-black tracking-tight">{currentRank}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Next: {nextRank}
              </div>
              <div className="text-xl font-bold text-foreground">
                {userXP} <span className="text-muted-foreground text-sm font-medium">/ {nextRankXP} XP</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden relative z-10 backdrop-blur-sm border shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary/80 to-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center relative z-10">
            {rank
              ? `You're ranked #${rank.position} of ${rank.total} candidates. Keep pushing!`
              : "Keep pushing!"}
          </p>
        </div>

        {/* Leaderboard Snippet */}
        <div className="glass rounded-2xl p-5 flex flex-col h-[180px]">
          <h3 className="font-bold flex items-center gap-2 mb-3 text-sm tracking-wide">
            <Trophy className="h-4 w-4 text-yellow-500" /> Cohort Top 3
          </h3>
          <div className="space-y-2 flex-1">
            {leaderboardLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))
            ) : topProfiles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-4">No one on the leaderboard yet.</p>
            ) : (
              topProfiles.map((p, idx) => {
                const isYou = p.id === user?.id;
                const name = isYou ? "You" : (p.full_name ?? "Anonymous");
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border text-sm transition-all hover:bg-muted/50",
                      isYou ? "border-primary bg-primary/5" : "bg-background/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-muted-foreground/70 w-3 text-xs">{idx + 1}</div>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="text-[10px]">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[100px]">{name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5">{p.xp} XP</Badge>
                  </div>
                );
              })
            )}
          </div>
          <Button variant="ghost" className="w-full mt-2 text-[10px] h-6 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/leaderboard">
              View Full Rankings <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quest Modules */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2 shrink-0">
          <Target className="h-5 w-5 text-primary" /> Learning Quests
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {quests.map((quest, idx) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-xl border p-5 hover-lift transition-all",
                quest.status === "locked" ? "bg-muted/20 opacity-60 grayscale-[0.5]" : "glass shadow-sm hover:shadow-md",
              )}
            >
              {quest.status === "completed" && (
                <div className="absolute top-3 right-3 text-green-500 bg-green-500/10 p-1 rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              {quest.status === "locked" && (
                <div className="absolute top-3 right-3 text-muted-foreground bg-muted p-1 rounded-full">
                  <Lock className="h-4 w-4" />
                </div>
              )}

              <div className="mb-3">
                <Badge variant={quest.status === "active" ? "default" : "secondary"} className="text-[10px] px-2 py-0.5 shadow-sm">
                  {quest.xp} XP
                </Badge>
              </div>

              <h4 className="font-bold text-base mb-1.5 leading-tight">{quest.title}</h4>
              <p className="text-xs text-muted-foreground mb-4 flex-1 line-clamp-3">{quest.desc}</p>

              <Button
                variant={quest.status === "active" ? "default" : "outline"}
                disabled={quest.status === "locked"}
                className={cn("w-full h-8 text-xs", quest.status === "active" && "shadow-md")}
                asChild={quest.status !== "locked"}
              >
                {quest.status === "locked" ? (
                  <span className="flex items-center justify-center gap-1.5"><Lock className="h-3 w-3" /> Locked</span>
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
