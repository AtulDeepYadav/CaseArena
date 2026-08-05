import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Users, Clock, Target, Calendar as CalendarIcon, MessageSquare, Play, Square, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  component: SessionDetailsPage,
});

type Session = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  status: "draft" | "published" | "live" | "completed";
  scheduled_time: string;
  estimated_duration_mins: number;
  max_seats: number;
  host_id: string;
};

type Participant = {
  user_id: string;
  role: "host" | "interviewer" | "candidate" | "observer";
  profiles: { full_name: string; avatar_url: string };
};

type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  event_type: "message" | "system" | "ai";
  created_at: string;
  profiles?: { full_name: string; avatar_url: string };
};

function SessionDetailsPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { session: authSession } = useAuth();
  
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const userId = authSession?.user.id;
  const isHost = session?.host_id === userId;
  const myParticipantRecord = participants.find(p => p.user_id === userId);
  const isParticipant = !!myParticipantRecord;

  // 1. Fetch Session Data
  useEffect(() => {
    async function fetchSession() {
      setLoading(true);
      // Fetch Session
      const { data: sessData, error: sessErr } = await supabase
        .from("collab_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
        
      if (sessErr || !sessData) {
        toast.error("Session not found.");
        navigate({ to: "/sessions" });
        return;
      }
      setSession(sessData as Session);

      // Fetch Participants
      const { data: partData } = await supabase
        .from("collab_participants")
        .select(`
          user_id, role,
          profiles(full_name, avatar_url)
        `)
        .eq("session_id", sessionId);
        
      if (partData) setParticipants(partData as any[]);

      // Fetch Chat History if Live or Completed
      if (sessData.status === "live" || sessData.status === "completed") {
        const { data: chatData } = await supabase
          .from("collab_transcript_events")
          .select(`
            id, user_id, content, event_type, created_at,
            profiles(full_name, avatar_url)
          `)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });
          
        if (chatData) setMessages(chatData as any[]);
      }
      
      setLoading(false);
    }
    fetchSession();
  }, [sessionId, navigate]);

  // 2. Realtime Subscriptions (Supabase WebSockets)
  useEffect(() => {
    if (!session || !isParticipant) return;

    const channel = supabase.channel(`session_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collab_transcript_events", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          // Fetch user details for new message
          const newMsg = payload.new as ChatMessage;
          if (newMsg.user_id) {
            const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", newMsg.user_id).single();
            if (data) newMsg.profiles = data;
          }
          setMessages(prev => [...prev, newMsg]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "collab_sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as Session)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collab_participants", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const newPart = payload.new as Participant;
          const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", newPart.user_id).single();
          if (data) newPart.profiles = data;
          setParticipants(prev => [...prev, newPart]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, isParticipant]);

  const handleJoin = async (role: "candidate" | "interviewer" | "observer") => {
    if (!userId) return;
    setIsJoining(true);
    try {
      // Note: In production, use RPC to prevent race conditions natively.
      const { error } = await supabase.from("collab_participants").insert({
        session_id: sessionId,
        user_id: userId,
        role: role,
        status: "joined"
      });
      if (error) throw error;
      toast.success("Joined session successfully!");
      
      // Seamlessly update local state without reloading
      const { data: userData } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).single();
      const newParticipant: Participant = {
        user_id: userId,
        role: role,
        profiles: userData || { full_name: "You", avatar_url: "" }
      };
      setParticipants(prev => [...prev, newParticipant]); 
    } catch (err) {
      toast.error("Failed to join. Session might be full.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !userId) return;
    
    const content = messageInput;
    setMessageInput("");
    
    await supabase.from("collab_transcript_events").insert({
      session_id: sessionId,
      user_id: userId,
      content,
      event_type: "message"
    });
  };

  const updateSessionStatus = async (status: "live" | "completed") => {
    await supabase.from("collab_sessions").update({ status }).eq("id", sessionId);
    if (status === "live") {
      await supabase.from("collab_transcript_events").insert({
        session_id: sessionId,
        content: "Session has started.",
        event_type: "system"
      });
    } else if (status === "completed") {
      await supabase.from("collab_transcript_events").insert({
        session_id: sessionId,
        content: "Session has ended. AI Observer is generating the report...",
        event_type: "system"
      });
    }
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!session) return null;

  // VIEW 1: Booking & Details Page (If not joined, or if it hasn't started and you are waiting)
  if (!isParticipant || session.status === "published") {
    const seatsLeft = session.max_seats - participants.length;
    return (
      <div className="mx-auto max-w-4xl pb-16">
        <div className="rounded-3xl glass p-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
            <div>
              <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                {session.status.toUpperCase()}
              </Badge>
              <h1 className="text-3xl font-bold">{session.title}</h1>
              <p className="mt-4 text-muted-foreground whitespace-pre-wrap">{session.description || "No description provided."}</p>
              
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> {format(new Date(session.scheduled_time), "PPP")}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {format(new Date(session.scheduled_time), "p")} ({session.estimated_duration_mins}m)</div>
                <div className="flex items-center gap-2"><Target className="h-4 w-4" /> {session.difficulty}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {participants.length}/{session.max_seats} joined</div>
              </div>
            </div>

            {/* Host Controls */}
            {isHost && session.status === "published" && (
              <div className="flex flex-col gap-3 min-w-[200px] p-4 glass-strong rounded-2xl text-center">
                <span className="text-sm font-semibold">Host Controls</span>
                <Button onClick={() => updateSessionStatus("live")} className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <Play className="mr-2 h-4 w-4" /> Start Session
                </Button>
              </div>
            )}
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-semibold mb-4">Participants</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-4 rounded-xl border p-4 bg-background/50">
                  <Avatar>
                    <AvatarImage src={p.profiles?.avatar_url} />
                    <AvatarFallback>{p.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{p.profiles?.full_name} {p.user_id === userId && "(You)"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Join Actions */}
          {!isParticipant && session.status === "published" && seatsLeft > 0 && (
            <div className="mt-12 border-t pt-8">
              <h3 className="text-lg font-semibold mb-4">Join this Session</h3>
              <div className="flex gap-4">
                <Button disabled={isJoining} onClick={() => handleJoin("candidate")} className="flex-1 bg-gradient-primary">
                  Join as Candidate
                </Button>
                <Button disabled={isJoining} onClick={() => handleJoin("observer")} variant="outline" className="flex-1">
                  Join as Observer
                </Button>
              </div>
            </div>
          )}
          
          {isParticipant && session.status === "published" && !isHost && (
            <div className="mt-12 border-t pt-8 text-center text-muted-foreground">
              Waiting for the host to start the session...
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: Live Room (WebSockets enabled)
  return (
    <div className="mx-auto max-w-6xl h-[calc(100vh-8rem)]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Case & Participants (Zones 1 & 3) */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Controls / Info */}
          <div className="glass rounded-2xl p-6 flex flex-col items-center text-center">
            <Badge variant="destructive" className="mb-2 animate-pulse">LIVE NOW</Badge>
            <h2 className="font-bold">{session.title}</h2>
            <div className="text-xs text-muted-foreground mt-1">Est: {session.estimated_duration_mins}m</div>
            
            {isHost && session.status === "live" && (
              <Button size="sm" onClick={() => updateSessionStatus("completed")} variant="destructive" className="mt-4 w-full">
                <Square className="mr-2 h-4 w-4" /> End Session
              </Button>
            )}
            
            {session.status === "completed" && (
              <Button size="sm" variant="default" className="mt-4 w-full" onClick={() => navigate({ to: "/sessions" })}>
                Leave Room
              </Button>
            )}
          </div>

          {/* Participants */}
          <div className="glass rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">In the Room</h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.profiles?.avatar_url} />
                    <AvatarFallback>{p.profiles?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium truncate max-w-[120px]">{p.profiles?.full_name}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Workspace & Transcript (Zone 2) */}
        <div className="col-span-1 lg:col-span-3 glass rounded-2xl flex flex-col overflow-hidden">
          <div className="border-b p-4 bg-background/50 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Session Workspace</h3>
            <span className="text-xs text-muted-foreground">
              {myParticipantRecord?.role === "observer" ? "You are observing silently." : "You are live."}
            </span>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isMe = msg.user_id === userId;
                  
                  if (msg.event_type === "system") {
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-4">
                        <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">{msg.content}</span>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("flex items-start gap-3 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "")}
                    >
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={msg.profiles?.avatar_url} />
                        <AvatarFallback>{msg.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <span className="text-xs text-muted-foreground mb-1 ml-1">{msg.profiles?.full_name}</span>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 bg-background/50 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder={session.status === "completed" ? "Session has ended..." : "Type your message..."}
                disabled={myParticipantRecord?.role === "observer" || session.status === "completed"}
                className="flex-1 bg-background"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!messageInput.trim() || myParticipantRecord?.role === "observer" || session.status === "completed"}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
