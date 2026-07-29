import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — CaseForge" },
      { name: "description", content: "Moderation and platform administration." },
      { property: "og:title", content: "Admin Console — CaseForge" },
      { property: "og:description", content: "Moderation and platform administration." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Admin Console" description="Moderation and platform administration." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
