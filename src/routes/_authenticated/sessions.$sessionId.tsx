import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [
      { title: "Session Room — CaseArena" },
      { name: "description", content: "Live group prep room with chat and shared notes." },
      { property: "og:title", content: "Session Room — CaseArena" },
      { property: "og:description", content: "Live group prep room with chat and shared notes." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Session Room" description="Live group prep room with chat and shared notes." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
