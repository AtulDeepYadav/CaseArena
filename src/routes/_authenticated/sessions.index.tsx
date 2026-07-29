import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [
      { title: "Join Sessions — CaseForge" },
      { name: "description", content: "Browse and book upcoming group prep sessions." },
      { property: "og:title", content: "Join Sessions — CaseForge" },
      { property: "og:description", content: "Browse and book upcoming group prep sessions." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Join Sessions" description="Browse and book upcoming group prep sessions." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
