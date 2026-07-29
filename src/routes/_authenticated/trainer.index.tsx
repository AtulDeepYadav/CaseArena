import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { generateCase } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/trainer/")({
  head: () => ({
    meta: [
      { title: "AI Trainer — CaseForge" },
      { name: "description", content: "Generate consulting and product cases and get AI feedback." },
      { property: "og:title", content: "AI Trainer — CaseForge" },
      { property: "og:description", content: "Practice timed cases with an AI interviewer and scored feedback." },
    ],
  }),
  component: TrainerHome,
});

const categories = ["Consulting", "Product Management", "Marketing", "Operations", "Finance", "General Business"];
const caseTypes = ["Market Entry", "Pricing", "Growth", "Profitability", "M&A", "Operations", "Product Design", "Product Strategy", "Product Metrics"];
const interviewTypes = ["Interviewer-led", "Candidate-led", "Written Case"];

function TrainerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const generate = useServerFn(generateCase);
  const [category, setCategory] = useState(categories[0]);
  const [caseType, setCaseType] = useState(caseTypes[0]);
  const [interviewType, setInterviewType] = useState(interviewTypes[0]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [duration, setDuration] = useState("30");
  const [busy, setBusy] = useState(false);

  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_attempts")
        .select("id,case_title,category,score,status,created_at,time_taken_seconds")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const chartData = [...attempts]
    .filter((a) => typeof a.score === "number")
    .reverse()
    .map((a, i) => ({ name: `#${i + 1}`, score: a.score as number }));

  const start = async () => {
    setBusy(true);
    try {
      const generated = await generate({
        data: {
          category,
          caseType,
          interviewType,
          difficulty,
          durationMinutes: Number(duration),
        },
      });
      const { data, error } = await supabase
        .from("ai_attempts")
        .insert({
          user_id: user!.id,
          category,
          case_type: caseType,
          interview_type: interviewType,
          difficulty,
          duration_minutes: Number(duration),
          case_title: generated.title ?? `${caseType} case`,
          case_content: generated,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        type: "ai",
        description: `Started AI case: ${generated.title}`,
      });
      navigate({ to: "/trainer/$attemptId", params: { attemptId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="AI Trainer" description="Configure a case, solve it against the clock, get scored." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl glass p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">New case</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Domain">
              <Picker value={category} onChange={setCategory} options={categories} />
            </Field>
            <Field label="Case type">
              <Picker value={caseType} onChange={setCaseType} options={caseTypes} />
            </Field>
            <Field label="Interview type">
              <Picker value={interviewType} onChange={setInterviewType} options={interviewTypes} />
            </Field>
            <Field label="Difficulty">
              <Picker
                value={difficulty}
                onChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
                options={["easy", "medium", "hard"]}
              />
            </Field>
            <Field label="Duration (minutes)">
              <Picker value={duration} onChange={setDuration} options={["20", "30", "45", "60"]} />
            </Field>
          </div>
          <Button onClick={start} disabled={busy} className="mt-5 bg-gradient-primary">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate case
          </Button>
        </section>

        <section className="rounded-2xl glass p-5">
          <h2 className="text-sm font-semibold">Improvement graph</h2>
          {chartData.length < 2 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Complete two cases to see your score trend.
            </p>
          ) : (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl glass p-5">
        <h2 className="text-sm font-semibold">Previous attempts</h2>
        <div className="mt-4 space-y-2">
          {attempts.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
          {attempts.map((a) => (
            <Link
              key={a.id}
              to="/trainer/$attemptId"
              params={{ attemptId: a.id }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.case_title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.category} · {new Date(a.created_at).toLocaleDateString()}
                  {a.time_taken_seconds ? ` · ${Math.round(a.time_taken_seconds / 60)} min` : ""}
                </p>
              </div>
              <Badge variant={a.status === "evaluated" ? "default" : "secondary"}>
                {a.status === "evaluated" ? `${a.score}/100` : a.status.replace("_", " ")}
              </Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Picker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
