import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Bell, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <PageHeader title="Notifications" description="Updates on sessions, AI feedback and community activity." />
        <Button variant="outline" className="glass">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Mark all as read
        </Button>
      </div>
      
      <div className="rounded-3xl glass p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You're all caught up!</h3>
        <p className="text-muted-foreground max-w-md">
          You don't have any new notifications right now. Check back later for updates on your sessions, new followers, and AI feedback reports.
        </p>
      </div>
    </div>
  );
}
