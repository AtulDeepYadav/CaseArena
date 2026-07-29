import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CaseForge" },
      { name: "description", content: "Manage account preferences and notifications." },
      { property: "og:title", content: "Settings — CaseForge" },
      { property: "og:description", content: "Manage account preferences and notifications." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Manage account preferences and notifications." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
