import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CaseArena" },
      { name: "description", content: "Top performers across cases, uploads and sessions." },
    ],
  }),
  component: LeaderboardPage,
});

type LeaderboardProfile = {
  id: string;
  full_name: string;
  avatar_url: string;
  xp: number;
  streak: number;
  specialization: string;
};

function LeaderboardPage() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, xp, streak, specialization")
          .order("xp", { ascending: false })
          .limit(50);
          
        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        <PageHeader title="Leaderboard" description="Global All-Time Rankings" />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-2xl w-full"></div>
          <div className="h-96 bg-muted rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  const top3 = profiles.slice(0, 3);
  const rest = profiles.slice(3);
  const myRankIndex = profiles.findIndex((p) => p.id === session?.user?.id);
  
  // Podium rendering helper
  const renderPodiumPlace = (profile: LeaderboardProfile, rank: number) => {
    if (!profile) return null;
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    
    // Style configurations based on rank
    const ringColor = isFirst ? "ring-yellow-400" : isSecond ? "ring-gray-300" : "ring-amber-600";
    const badgeColor = isFirst ? "bg-yellow-400 text-yellow-950" : isSecond ? "bg-gray-300 text-gray-900" : "bg-amber-600 text-white";
    const height = isFirst ? "h-64" : isSecond ? "h-56" : "h-48";
    
    return (
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: rank * 0.1, duration: 0.5, type: "spring" }}
        className="flex flex-col items-center justify-end"
      >
        <div className="relative mb-4">
          {isFirst && <Trophy className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-8 text-yellow-400 z-10" />}
          <Avatar className={cn("h-20 w-20 ring-4 ring-offset-4 ring-offset-background", ringColor)}>
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className={cn("absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-black shadow-lg", badgeColor)}>
            #{rank}
          </div>
        </div>
        
        <div className={cn("w-28 sm:w-36 rounded-t-2xl glass-strong border-b-0 flex flex-col items-center p-4", height)}>
          <div className="font-bold text-center truncate w-full">{profile.full_name}</div>
          <div className="text-sm font-black text-primary mt-2">{profile.xp} XP</div>
          {profile.streak > 0 ? (
            <div className="flex items-center gap-1 text-xs text-orange-500 font-bold mt-1">
              <Flame className="h-3 w-3" /> {profile.streak}
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-16">
      <PageHeader 
        title="Leaderboard" 
        description="Top performers across cases, uploads and sessions." 
      />

      {/* Podium Section */}
      <div className="flex items-end justify-center gap-2 sm:gap-6 pt-10">
        {renderPodiumPlace(top3[1], 2)}
        {renderPodiumPlace(top3[0], 1)}
        {renderPodiumPlace(top3[2], 3)}
      </div>

      {/* List Section */}
      <div className="space-y-4">
        {rest.map((profile, idx) => {
          const rank = idx + 4;
          const isMe = profile.id === session?.user?.id;
          
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (idx * 0.05) }}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-colors",
                isMe ? "border-primary bg-primary/5" : "glass"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 text-center font-bold text-muted-foreground">
                  {rank}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {profile.full_name} 
                    {isMe && <Badge variant="secondary" className="text-[10px] uppercase">You</Badge>}
                  </div>
                  {profile.specialization && (
                    <div className="text-xs text-muted-foreground">{profile.specialization}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {profile.streak > 0 ? (
                  <div className="hidden sm:flex items-center gap-1 text-orange-500 font-bold">
                    <Flame className="h-4 w-4" /> {profile.streak}
                  </div>
                ) : null}
                <div className="font-black text-right w-20">
                  {profile.xp} <span className="text-xs text-muted-foreground font-normal">XP</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Sticky footer for current user if not in top 50 (or not found) */}
      {myRankIndex === -1 && session && (
         <div className="sticky bottom-4 mx-auto max-w-2xl bg-background/95 backdrop-blur-md border border-primary/50 shadow-2xl p-4 rounded-2xl flex justify-between items-center z-50">
           <div className="flex items-center gap-3">
             <div className="text-sm font-semibold text-muted-foreground">Your Rank</div>
             <div className="font-bold text-xl">50+</div>
           </div>
           <div className="text-sm">Keep practicing to climb the ranks!</div>
         </div>
      )}

    </div>
  );
}
