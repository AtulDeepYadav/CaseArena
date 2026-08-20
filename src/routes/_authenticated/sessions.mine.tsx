import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Target, Users, Play, CheckCircle2, Inbox } from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions/mine")({
  head: () => ({
    meta: [
      { title: "My Sessions — CaseArena" },
      { name: "description", content: "Sessions you are hosting or have booked." },
    ],
  }),
  component: MySessionsPage,
});

type MySession = {
  meeting_link?: string;
  role: "host" | "interviewer" | "candidate" | "observer";
  session: {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    status: "draft" | "published" | "live" | "completed";
    scheduled_time: string;
    estimated_duration_mins: number;
    max_seats: number;
    host: {
      full_name: string;
      avatar_url: string;
    };
    participants: { count: number }[];
  };
};

function MySessionsPage() {
  const { session: authSession } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const handleCancelSession = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to cancel this session?")) return;
    setIsProcessing(sessionId);
    try {
      const { error } = await supabase.from('collab_sessions').update({ status: 'completed' }).eq('id', sessionId);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.session.id !== sessionId));
      toast.success("Session cancelled.");
    } catch (err) {
      toast.error("Failed to cancel session");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleLeaveSession = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to leave this session?")) return;
    if (!authSession?.user.id) return;
    setIsProcessing(sessionId);
    try {
      const { error } = await supabase.from('collab_participants').delete().eq('session_id', sessionId).eq('user_id', authSession.user.id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.session.id !== sessionId));
      toast.success("You left the session.");
    } catch (err) {
      toast.error("Failed to leave session");
    } finally {
      setIsProcessing(null);
    }
  };
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMySessions() {
      if (!authSession?.user.id) return;

      const { data, error } = await supabase
        .from("collab_participants")
        .select(`
          role,
          session:collab_sessions!inner (
            id, title, difficulty, status, scheduled_time, estimated_duration_mins, max_seats,
            host:profiles!collab_sessions_host_id_fkey(full_name, avatar_url),
            participants:collab_participants(count),
            meeting_link
          )
        `)
        .eq("user_id", authSession.user.id)
        .order("session(scheduled_time)", { ascending: true });
        
      if (!error && data) {
        setSessions(data as any);
      }
      setLoading(false);
    }
    
    fetchMySessions();
  }, [authSession?.user.id]);

  const upcomingSessions = sessions.filter(s => s.session.status !== "completed");
  const pastSessions = sessions.filter(s => s.session.status === "completed").reverse(); // Most recent first

  const SessionCard = ({ data, idx }: { data: MySession, idx: number }) => {
    const s = data.session;
    const date = new Date(s.scheduled_time);
    const occupiedSeats = s.participants[0]?.count || 1;
    
    const difficultyColor = 
      s.difficulty === "easy" ? "bg-green-500/10 text-green-500 border-green-500/20" :
      s.difficulty === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
      "bg-red-500/10 text-red-500 border-red-500/20";

    const roleColor =
      data.role === "host" ? "bg-purple-500/10 text-purple-500" :
      data.role === "candidate" ? "bg-blue-500/10 text-blue-500" :
      "bg-zinc-500/10 text-zinc-500";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
      >
        <div className="flex flex-col h-full justify-between rounded-2xl glass p-6 transition-all hover:ring-1 hover:ring-primary/50">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex gap-2">
                <Badge variant="outline" className={difficultyColor}>
                  {s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1)}
                </Badge>
                {s.status === "live" && (
                  <Badge variant="destructive" className="animate-pulse">LIVE NOW</Badge>
                )}
              </div>
              <Badge variant="secondary" className={cn("capitalize border-transparent", roleColor)}>
                {data.role}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-lg line-clamp-2 mb-1">{s.title}</h3>
            
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(date, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(date, "h:mm a")} • {s.estimated_duration_mins}m</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{occupiedSeats}/{s.max_seats} joined</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/50 pt-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 ring-2 ring-background">
                <AvatarImage src={s.host.avatar_url} />
                <AvatarFallback>{s.host.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{s.host.full_name}</span>
            </div>
            
            <div className="flex gap-2 flex-wrap justify-end mt-4 sm:mt-0">
              {s.meeting_link && s.status !== "completed" && (
                <Button asChild size="sm" variant="outline" className="gap-1 text-blue-500 hover:text-blue-600 border-blue-500/20">
                  <a href={s.meeting_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-4 w-4" /> Join Meet
                  </a>
                </Button>
              )}
              
              {data.role === "host" && s.status !== "completed" && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isProcessing === s.id}
                  onClick={(e) => handleCancelSession(e, s.id)}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
              
              {data.role !== "host" && s.status !== "completed" && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isProcessing === s.id}
                  onClick={(e) => handleLeaveSession(e, s.id)}
                >
                  <X className="h-4 w-4 mr-1" /> Leave
                </Button>
              )}

              <Button asChild size="sm" variant={s.status === "live" ? "default" : "secondary"}>
                <Link to={`/sessions/${s.id}`}>
                  {s.status === "completed" ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> View Report</>
                  ) : s.status === "live" ? (
                    <><Play className="mr-2 h-4 w-4" /> Enter Room</>
                  ) : (
                    "View Details"
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <PageHeader 
        title="My Sessions" 
        description="Manage the cases you are hosting or have booked to practice." 
      />

      <Tabs defaultValue="upcoming" className="mt-8">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 glass">
          <TabsTrigger value="upcoming">Upcoming & Live</TabsTrigger>
          <TabsTrigger value="past">Past Sessions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="min-h-[400px]">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl glass animate-pulse" />)}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl glass p-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Inbox className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">No upcoming sessions</h3>
              <p className="mt-2 text-muted-foreground max-w-sm mb-6">
                You haven't joined or scheduled any sessions yet.
              </p>
              <div className="flex gap-4">
                <Button asChild variant="outline" className="glass">
                  <Link to="/sessions">Find a Session</Link>
                </Button>
                <Button asChild className="bg-gradient-primary">
                  <Link to="/sessions/host">Host a Session</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session, idx) => (
                <SessionCard key={session.session.id} data={session} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="min-h-[400px]">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1].map(i => <div key={i} className="h-64 rounded-2xl glass animate-pulse" />)}
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl glass p-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No past sessions</h3>
              <p className="mt-2 text-muted-foreground max-w-sm">
                Your completed collaborative sessions and AI evaluations will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastSessions.map((session, idx) => (
                <SessionCard key={session.session.id} data={session} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
