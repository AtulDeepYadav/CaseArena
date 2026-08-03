import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CaseArena" },
      { name: "description", content: "Your CaseArena profile, badges and progress." },
      { property: "og:title", content: "Profile — CaseArena" },
      { property: "og:description", content: "Your CaseArena profile, badges and progress." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Profile" description="Your CaseArena profile, badges and progress." />
      <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
        This section is being built next.
      </div>
    </div>
  );
}
