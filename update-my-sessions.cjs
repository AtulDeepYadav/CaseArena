const fs = require('fs');
const path = require('path');
const file = path.join('src', 'routes', '_authenticated', 'sessions.mine.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'participants:collab_participants(count)',
  'participants:collab_participants(count),\n            meeting_link'
);

content = content.replace(
  'type MySession = {',
  'type MySession = {\n  meeting_link?: string;'
);

content = content.replace(
  'const { session: authSession } = useAuth();',
  `const { session: authSession } = useAuth();
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
  };`
);

if (!content.includes('import { toast }')) {
  content = content.replace(
    'import { cn } from "@/lib/utils";',
    'import { cn } from "@/lib/utils";\nimport { toast } from "sonner";\nimport { ExternalLink, X } from "lucide-react";'
  );
} else {
  content = content.replace(
    'import { Calendar, Clock, Target, Users, Play, CheckCircle2, Inbox } from "lucide-react";',
    'import { Calendar, Clock, Target, Users, Play, CheckCircle2, Inbox, ExternalLink, X } from "lucide-react";'
  );
}

content = content.replace(
  /<Button asChild size="sm".*?<\/Button>/s,
  `<div className="flex gap-2 flex-wrap justify-end mt-4 sm:mt-0">
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
                <Link to={\`/sessions/\${s.id}\`}>
                  {s.status === "completed" ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> View Report</>
                  ) : s.status === "live" ? (
                    <><Play className="mr-2 h-4 w-4" /> Enter Room</>
                  ) : (
                    "View Details"
                  )}
                </Link>
              </Button>
            </div>`
);

fs.writeFileSync(file, content);
console.log("Updated sessions.mine.tsx successfully");
