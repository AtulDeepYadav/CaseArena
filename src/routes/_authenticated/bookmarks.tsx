import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — CaseArena" },
      { name: "description", content: "Saved cases and community files." },
      { property: "og:title", content: "Bookmarks — CaseArena" },
      { property: "og:description", content: "Saved cases and community files." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bookmarks" description="Saved cases and community files." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
