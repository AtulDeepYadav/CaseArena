import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Pause, Play, ArrowLeft, Send, Bookmark } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { evaluateAttempt } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/trainer/$attemptId")({
  head: () => ({
    meta: [
      { title: "Case attempt — CaseForge" },
      { name: "description", content: "Solve your AI-generated case and review scored feedback." },
      { property: "og:title", content: "Case attempt — CaseForge" },
      { property: "og:description", content: "Timed case solving with structured AI feedback." },
    ],
  }),
  component: AttemptPage,
});

type Exhibit = { label: string; description: string; rows: { name: string; value: number }[] };
type CaseContent = {
  title?: string;
  company_overview?: string;
  business_context?: string;
  problem_statement?: string;
  supporting_information?: string[];
  exhibits?: Exhibit[];
  clarifying_answers?: { question: string; answer: string }[];
  ideal_solution?: string;
  suggested_frameworks?: string[];
};
type Feedback = {
  scores?: Record<string, number>;
  overall?: number;
  strengths?: string[];
  weaknesses?: string[];
  improvement_tips?: string[];
  suggested_frameworks?: string[];
  ideal_solution?: string;
};

function AttemptPage() {
  const { attemptId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const evaluate = useServerFn(evaluateAttempt);

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_attempts").select("*").eq("id", attemptId).single();
      if (error) throw error;
      return data;
    },
  });

  const [answer, setAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (attempt && !loaded.current) {
      loaded.current = true;
      setAnswer(attempt.answer ?? "");
      setNotes(attempt.notes ?? "");
      setElapsed(attempt.time_taken_seconds ?? 0);
      if (attempt.status !== "in_progress") setRunning(false);
    }
  }, [attempt]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const content = (attempt?.case_content ?? {}) as CaseContent;
  const feedback = (attempt?.feedback ?? null) as Feedback | null;
  const total = (attempt?.duration_minutes ?? 30) * 60;
  const pct = Math.min(100, Math.round((elapsed / total) * 100));

  const scoreRows = useMemo(
    () =>
      Object.entries(feedback?.scores ?? {}).map(([k, v]) => ({
        name: k.replace(/_/g, " "),
        score: v,
      })),
    [feedback],
  );

  const submit = async () => {
    if (answer.trim().length < 40) return toast.error("Write a fuller answer before submitting");
    setBusy(true);
    setRunning(false);
    try {
      const result = await evaluate({
        data: {
          caseTitle: attempt!.case_title,
          caseContent: JSON.stringify(content).slice(0, 20000),
          answer: answer.slice(0, 20000),
          assumptions: assumptions.slice(0, 5000),
          timeTakenSeconds: elapsed,
        },
      });
      const { error } = await supabase
        .from("ai_attempts")
        .update({
          answer,
          notes,
          status: "evaluated",
          score: Math.round(result.overall ?? 0),
          feedback: result,
          time_taken_seconds: elapsed,
        })
        .eq("id", attemptId);
      if (error) throw error;
      await Promise.all([
        supabase.from("activity_logs").insert({
          user_id: user!.id,
          type: "ai",
          description: `Completed case "${attempt!.case_title}" — scored ${Math.round(result.overall ?? 0)}/100`,
        }),
        supabase.from("notifications").insert({
          user_id: user!.id,
          category: "ai",
          title: "AI feedback ready",
          body: `Your feedback for "${attempt!.case_title}" is available.`,
          link: `/trainer/${attemptId}`,
        }),
      ]);
      await queryClient.invalidateQueries({ queryKey: ["attempt", attemptId] });
      toast.success("Feedback ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    await supabase
      .from("ai_attempts")
      .update({ answer, notes, time_taken_seconds: elapsed })
      .eq("id", attemptId);
    toast.success("Draft saved");
  };

  const bookmark = async () => {
    await supabase.from("bookmarks").insert({ user_id: user!.id, attempt_id: attemptId });
    toast.success("Bookmarked");
  };

  if (isLoading) return <Skeleton className="h-[60vh] w-full rounded-2xl" />;
  if (!attempt) return <p className="text-sm text-muted-foreground">Attempt not found.</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/trainer">
            <ArrowLeft className="mr-1 h-4 w-4" /> Trainer
          </Link>
        </Button>
        <Badge variant="secondary" className="capitalize">{attempt.difficulty}</Badge>
        <Badge variant="secondary">{attempt.category}</Badge>
        <Badge variant="secondary">{attempt.interview_type}</Badge>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={bookmark}>
          <Bookmark className="mr-1 h-4 w-4" /> Bookmark
        </Button>
      </div>

      <h1 className="text-2xl font-bold sm:text-3xl">{attempt.case_title}</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl glass p-5">
          <Tabs defaultValue="case">
            <TabsList>
              <TabsTrigger value="case">Case</TabsTrigger>
              <TabsTrigger value="exhibits">Exhibits</TabsTrigger>
              <TabsTrigger value="clarify">Clarifications</TabsTrigger>
            </TabsList>
            <TabsContent value="case" className="mt-4 space-y-4 text-sm leading-relaxed">
              <Block title="Company overview" body={content.company_overview} />
              <Block title="Business context" body={content.business_context} />
              <Block title="Problem statement" body={content.problem_statement} />
              {!!content.supporting_information?.length && (
                <div>
                  <h3 className="font-semibold">Supporting information</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {content.supporting_information.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
            <TabsContent value="exhibits" className="mt-4 space-y-6">
              {(content.exhibits ?? []).map((ex, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold">{ex.label}</h3>
                  <p className="text-xs text-muted-foreground">{ex.description}</p>
                  <div className="mt-3 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ex.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" />
                        <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                        <RTooltip
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                          }}
                        />
                        <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
              {!content.exhibits?.length && (
                <p className="text-sm text-muted-foreground">No exhibits for this case.</p>
              )}
            </TabsContent>
            <TabsContent value="clarify" className="mt-4">
              <Accordion type="single" collapsible>
                {(content.clarifying_answers ?? []).map((c, i) => (
                  <AccordionItem key={i} value={`q${i}`}>
                    <AccordionTrigger className="text-sm">{c.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {c.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {!content.clarifying_answers?.length && (
                <p className="text-sm text-muted-foreground">No clarifying questions available.</p>
              )}
            </TabsContent>
          </Tabs>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl glass p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-bold tabular-nums">
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </span>
              {attempt.status === "in_progress" && (
                <Button variant="outline" size="sm" onClick={() => setRunning((r) => !r)}>
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <Progress value={pct} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              Target {attempt.duration_minutes} minutes
            </p>
          </div>

          {attempt.status === "in_progress" ? (
            <div className="rounded-2xl glass p-5">
              <h2 className="text-sm font-semibold">Your work</h2>
              <Textarea
                className="mt-3 min-h-28"
                placeholder="Scratchpad / notes"
                value={notes}
                maxLength={8000}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Textarea
                className="mt-3 min-h-20"
                placeholder="Assumptions you're marking"
                value={assumptions}
                maxLength={4000}
                onChange={(e) => setAssumptions(e.target.value)}
              />
              <Textarea
                className="mt-3 min-h-40"
                placeholder="Structured answer & recommendation"
                value={answer}
                maxLength={18000}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button size="sm" className="bg-gradient-primary" onClick={submit} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl glass p-5">
              <h2 className="text-sm font-semibold">Your submission</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{attempt.answer}</p>
            </div>
          )}
        </aside>
      </div>

      {feedback && (
        <section className="mt-6 rounded-2xl glass p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">AI feedback</h2>
            <Badge className="bg-gradient-primary text-base">{attempt.score}/100</Badge>
          </div>

          {!!scoreRows.length && (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreRows} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" domain={[0, 100]} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={120} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="score" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <List title="Strengths" items={feedback.strengths} />
            <List title="Weaknesses" items={feedback.weaknesses} />
            <List title="Improvement tips" items={feedback.improvement_tips} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <List title="Suggested frameworks" items={feedback.suggested_frameworks} />
            <Block title="Ideal solution" body={feedback.ideal_solution ?? content.ideal_solution} />
          </div>
        </section>
      )}
    </div>
  );
}

function Block({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
