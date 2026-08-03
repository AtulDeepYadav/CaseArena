import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/sessions/host")({
  head: () => ({
    meta: [
      { title: "Host a Session — CaseArena" },
      { name: "description", content: "Schedule a group case prep session for your cohort." },
      { property: "og:title", content: "Host a Session — CaseArena" },
      { property: "og:description", content: "Schedule a group case prep session for your cohort." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Host a Session" description="Schedule a group case prep session for your cohort." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
