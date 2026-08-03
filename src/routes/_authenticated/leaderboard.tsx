import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CaseArena" },
      { name: "description", content: "Top performers across cases, uploads and sessions." },
      { property: "og:title", content: "Leaderboard — CaseArena" },
      { property: "og:description", content: "Top performers across cases, uploads and sessions." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Leaderboard" description="Top performers across cases, uploads and sessions." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
