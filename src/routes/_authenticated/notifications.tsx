import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CaseArena" },
      { name: "description", content: "Updates on sessions, AI feedback and community activity." },
      { property: "og:title", content: "Notifications — CaseArena" },
      { property: "og:description", content: "Updates on sessions, AI feedback and community activity." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Notifications" description="Updates on sessions, AI feedback and community activity." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
