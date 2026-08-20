import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, ExternalLink, Briefcase, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/peers")({
  component: MatchmakerPage,
});

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
  batch: string;
  active_time: string;
  preferred_domains: string[];
  linkedin_url: string;
  etrigan_url?: string;
  bio?: string;
  skills?: string[];
  similarityScore?: number;
};

function MatchmakerPage() {
  const { session } = useAuth();
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findMatches() {
      if (!session?.user.id) return;
      
      // 1. Get my profile
      const { data: me } = await supabase
        .from("profiles")
        .select("batch, preferred_domains, active_time")
        .eq("id", session.user.id)
        .single();
        
      if (!me) return;
      setMyProfile(me as any);

      // 2. Fetch all other users
      const { data: others } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, batch, active_time, preferred_domains, linkedin_url, etrigan_url, bio, skills")
        .neq("id", session.user.id);

      if (others) {
        // Calculate similarity
        const scoredMatches = others.map(other => {
          let score = 0;
          let maxScore = 0;
          
          // Domain match (Up to 80 points)
          if (me.preferred_domains && other.preferred_domains) {
            const myDomains = new Set(me.preferred_domains);
            const sharedDomains = other.preferred_domains.filter((d: string) => myDomains.has(d));
            maxScore += 80;
            if (myDomains.size > 0) {
              score += (sharedDomains.length / myDomains.size) * 80;
            }
          }
          
          // Active time match (Up to 20 points)
          maxScore += 20;
          if (me.active_time && other.active_time && me.active_time === other.active_time) {
            score += 20;
          }

          const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
          return { ...other, similarityScore: percentage };
        });

        // Filter for >= 70% and sort highest first
        const topMatches = scoredMatches
          .filter(m => m.similarityScore >= 70)
          .sort((a, b) => b.similarityScore - a.similarityScore);
          
        setMatches(topMatches);
      }
      setLoading(false);
    }
    
    findMatches();
  }, [session?.user.id]);

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <PageHeader
        title="Peer Matchmaker"
        description="We found these peers whose domains and prep schedules strongly align with yours (>70% match)."
      />

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl glass animate-pulse" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-3xl glass p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No perfect matches yet</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any peers with a {">"}70% profile match right now. Check back as more students complete their onboarding!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {matches.map(match => (
              <div key={match.id} className="rounded-2xl glass p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={match.avatar_url} />
                        <AvatarFallback>{match.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{match.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{match.batch}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      {match.similarityScore}% Match
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <div className="flex items-start gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {match.preferred_domains?.map((d: string) => (
                          <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Active mostly in the <strong>{match.active_time}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1">View Profile</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Peer Profile</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 py-4">
                        <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                          <AvatarImage src={match.avatar_url} />
                          <AvatarFallback className="text-2xl">{match.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h2 className="text-xl font-bold">{match.full_name}</h2>
                          <p className="text-muted-foreground">{match.batch}</p>
                        </div>
                        
                        {match.bio && (
                          <div className="w-full mt-2 text-sm text-center bg-muted/30 p-3 rounded-lg">
                            "{match.bio}"
                          </div>
                        )}

                        <div className="w-full space-y-4 mt-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Preferred Domains</h4>
                            <div className="flex flex-wrap gap-1">
                              {match.preferred_domains?.map(d => (
                                <Badge key={d} variant="secondary">{d}</Badge>
                              ))}
                            </div>
                          </div>
                          
                          {match.skills && match.skills.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Skills</h4>
                              <div className="flex flex-wrap gap-1">
                                {match.skills.map(s => (
                                  <Badge key={s} variant="outline">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Prep Schedule</h4>
                            <p className="text-sm text-muted-foreground">Active mostly in the {match.active_time}</p>
                          </div>
                        </div>

                        <div className="w-full mt-4 flex gap-2">
                          <Button className="flex-1" variant="default" asChild disabled={!match.linkedin_url}>
                            {match.linkedin_url ? (
                              <a href={match.linkedin_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Connect on LinkedIn
                              </a>
                            ) : (
                              <span>No LinkedIn Provided</span>
                            )}
                          </Button>
                          {match.etrigan_url && (
                            <Button variant="outline" size="icon" asChild>
                              <a href={match.etrigan_url} target="_blank" rel="noreferrer" title="Etrigan Profile">
                                <FileText className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {match.linkedin_url && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={match.linkedin_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
