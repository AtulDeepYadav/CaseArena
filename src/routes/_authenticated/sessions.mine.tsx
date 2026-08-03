import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/sessions/mine")({
  head: () => ({
    meta: [
      { title: "My Sessions — CaseArena" },
      { name: "description", content: "Sessions you are hosting or have booked." },
      { property: "og:title", content: "My Sessions — CaseArena" },
      { property: "og:description", content: "Sessions you are hosting or have booked." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My Sessions" description="Sessions you are hosting or have booked." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
