import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, FolderKanban, Users, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaseArena — IIM Lucknow Case Preparation Portal" },
      {
        name: "description",
        content:
          "Practice consulting and product management cases with an AI trainer, share a curated case repository, and run live group prep sessions.",
      },
      { property: "og:title", content: "CaseArena — IIM Lucknow Case Preparation Portal" },
      {
        property: "og:description",
        content:
          "Practice consulting and product management cases with an AI trainer, share a curated case repository, and run live group prep sessions.",
      },
    ],
  }),
  component: Landing,
});

const epics = [
  {
    icon: Brain,
    title: "AI Case Trainer",
    body: "Generate interviewer-led or candidate-led cases across consulting, PM, marketing, finance and operations. Solve against a timer, then get scored on structure, hypothesis, math and communication.",
  },
  {
    icon: FolderKanban,
    title: "Case Repository",
    body: "A Drive-style workspace for your frameworks, transcripts and exhibits — with metadata, search, versions and a community layer of likes, ratings and comments.",
  },
  {
    icon: Users,
    title: "Group Prep Sessions",
    body: "Host or join scheduled peer sessions with capacity, waitlists and reminders, then run the live room with realtime chat, shared notes, raise-hand and a case timer.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen surface-aurora">
      <header className="sticky top-0 z-40">
        <div className="mx-auto mt-4 flex w-[min(1100px,92vw)] items-center justify-between rounded-2xl glass px-4 py-3">
          <span className="font-display text-lg font-bold tracking-tight">
            Case<span className="text-gradient">Forge</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to={session ? "/dashboard" : "/auth"}>
                {session ? "Open dashboard" : "Sign in"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(1100px,92vw)] pb-24">
        <section className="pt-20 pb-16 text-center sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built for IIM Lucknow placement prep
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-6xl">
              The case prep workspace for <span className="text-gradient">consulting & PM</span>{" "}
              interviews
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Practice with an AI interviewer, keep every framework and exhibit in one repository,
              and prep with your cohort in live rooms.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="bg-gradient-primary shadow-elevated">
                <Link to={session ? "/dashboard" : "/auth"}>
                  Start preparing
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          {epics.map((e, i) => (
            <motion.article
              key={e.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl glass p-6 hover-lift"
            >
              <e.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{e.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
            </motion.article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        CaseArena · IIM Lucknow Case Preparation Portal
      </footer>
    </div>
  );
}
