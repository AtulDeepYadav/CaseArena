import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Target, Users, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [
      { title: "Join Sessions — CaseArena" },
      { name: "description", content: "Browse and book upcoming group prep sessions." },
    ],
  }),
  component: SessionsDiscoveryPage,
});

type SessionWithHost = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  scheduled_time: string;
  estimated_duration_mins: number;
  max_seats: number;
  meeting_link?: string;
  host: {
    full_name: string;
    avatar_url: string;
  };
  participants: { count: number }[];
};

function SessionsDiscoveryPage() {
  const [sessions, setSessions] = useState<SessionWithHost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      // In a real app, use React Query. Fetching directly for simplicity.
      const { data, error } = await supabase
        .from("collab_sessions")
        .select(`
          id, title, difficulty, scheduled_time, estimated_duration_mins, max_seats, meeting_link,
          host:profiles!collab_sessions_host_id_fkey(full_name, avatar_url),
          participants:collab_participants(count)
        `)
        .eq("visibility", "public")
        .eq("status", "published")
        .gte("scheduled_time", new Date().toISOString())
        .order("scheduled_time", { ascending: true });
        
      if (!error && data) {
        // Supabase returns count as an array with one object { count: number }
        setSessions(data as any);
      }
      setLoading(false);
    }
    
    fetchSessions();
  }, []);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader 
          title="Discover Sessions" 
          description="Find peers and book slots for live collaborative case practice." 
        />
        <div className="flex gap-2">
          <Button asChild variant="default" className="bg-gradient-primary">
            <Link to="/sessions/host">Host a Session</Link>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sessions by topic or host..." className="pl-9 glass" />
        </div>
        <Button variant="outline" className="glass">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl glass animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl glass p-16 text-center">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No upcoming sessions</h3>
          <p className="mt-2 text-muted-foreground max-w-sm">
            There are no public sessions scheduled right now. Be the first to host one for your cohort!
          </p>
          <Button asChild className="mt-6">
            <Link to="/sessions/host">Create Session</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session, idx) => {
            const date = new Date(session.scheduled_time);
            const occupiedSeats = session.participants[0]?.count || 1;
            const seatsLeft = session.max_seats - occupiedSeats;
            const isFull = seatsLeft <= 0;

            const difficultyColor = 
              session.difficulty === "easy" ? "bg-green-500/10 text-green-500 border-green-500/20" :
              session.difficulty === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
              "bg-red-500/10 text-red-500 border-red-500/20";

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={session.id}
              >
                <a 
                  href={session.meeting_link || "#"} 
                  target={session.meeting_link ? "_blank" : "_self"}
                  rel="noreferrer"
                  className="block h-full group"
                >
                  <div className="flex h-full flex-col justify-between rounded-2xl glass p-6 transition-all hover:ring-1 hover:ring-primary/50 hover:shadow-lg hover:shadow-primary/5">
                    
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <Badge variant="outline" className={difficultyColor}>
                          {session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span className={isFull ? "text-destructive" : ""}>
                            {occupiedSeats}/{session.max_seats}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {session.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(date, "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{format(date, "h:mm a")} • {session.estimated_duration_mins}m</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 ring-2 ring-background">
                          <AvatarImage src={session.host.avatar_url} />
                          <AvatarFallback>{session.host.full_name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{session.host.full_name}</span>
                      </div>
                    </div>
                    </div>
                  
                </a>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
