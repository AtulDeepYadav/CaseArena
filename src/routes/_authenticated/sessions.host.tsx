import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Users, Clock, Globe, Lock, Target, Link2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sessions/host")({
  head: () => ({
    meta: [
      { title: "Host a Session — CaseArena" },
      { name: "description", content: "Schedule a group case prep session for your cohort." },
    ],
  }),
  component: HostSessionPage,
});

const sessionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  visibility: z.enum(["public", "invite", "private"]),
  scheduled_time: z.date(),
  estimated_duration_mins: z.number().min(30).max(180),
  max_seats: z.number().min(2).max(10),
  meeting_link: z.string().url("Must be a valid meeting URL"),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

function HostSessionPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty: "medium",
      visibility: "public",
      estimated_duration_mins: 60,
      max_seats: 4,
      meeting_link: "",
    },
  });

  const onSubmit = async (data: SessionFormValues) => {
    if (!session?.user.id) return;
    setIsSubmitting(true);
    try {
      // 1. Create Session
      const { data: newSession, error: sessionError } = await supabase
        .from("collab_sessions")
        .insert({
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          visibility: data.visibility,
          scheduled_time: data.scheduled_time.toISOString(),
          estimated_duration_mins: data.estimated_duration_mins,
          max_seats: data.max_seats,
          meeting_link: data.meeting_link || null,
          host_id: session.user.id,
          status: "published",
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Add Host as Participant
      const { error: participantError } = await supabase
        .from("collab_participants")
        .insert({
          session_id: newSession.id,
          user_id: session.user.id,
          role: "host",
          status: "joined",
        });

      if (participantError) throw participantError;

      toast.success("Session created successfully!");
      navigate({ to: "/sessions/$sessionId", params: { sessionId: newSession.id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHeader
        title="Host a Session"
        description="Schedule a collaborative case prep session and invite your peers."
      />

      <div className="mt-8 rounded-3xl glass p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> General Details
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input
                id="title"
                placeholder="e.g. Profitability Case - Retail Sector"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe what cases you want to practice or any prerequisites."
                className="resize-none"
                rows={3}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_link">Meeting Link (Required)</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="meeting_link"
                  placeholder="https://zoom.us/j/123..."
                  className="pl-9"
                  {...form.register("meeting_link")}
                />
              </div>
              {form.formState.errors.meeting_link && (
                <p className="text-sm text-destructive">{form.formState.errors.meeting_link.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Scheduling */}
            <div className="space-y-2">
              <Label>Scheduled Date & Time</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[180px] justify-start text-left font-normal",
                        !form.watch("scheduled_time") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("scheduled_time") ? (
                        format(form.watch("scheduled_time"), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("scheduled_time")}
                      onSelect={(date) => {
                        if (date) {
                          const existingDate = form.watch("scheduled_time");
                          if (existingDate) {
                            date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
                          } else {
                            date.setHours(18, 0, 0, 0);
                          }
                          form.setValue("scheduled_time", date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Input 
                  type="time" 
                  className="w-full sm:w-[130px]"
                  value={form.watch("scheduled_time") ? format(form.watch("scheduled_time"), "HH:mm") : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [hours, minutes] = e.target.value.split(":");
                    const newDate = form.watch("scheduled_time") ? new Date(form.watch("scheduled_time")) : new Date();
                    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    form.setValue("scheduled_time", newDate);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Globe className="h-3 w-3" /> Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
              {form.formState.errors.scheduled_time && (
                <p className="text-sm text-destructive">Please select a valid date and time.</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Expected Duration</Label>
              <Select
                onValueChange={(val) => form.setValue("estimated_duration_mins", parseInt(val))}
                defaultValue={form.watch("estimated_duration_mins").toString()}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Duration" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes (Standard)</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Participants */}
            <div className="space-y-2">
              <Label>Maximum Capacity</Label>
              <Select
                onValueChange={(val) => form.setValue("max_seats", parseInt(val))}
                defaultValue={form.watch("max_seats").toString()}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Seats" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 (1-on-1)</SelectItem>
                  <SelectItem value="3">3 (With Observer)</SelectItem>
                  <SelectItem value="4">4 (Standard Group)</SelectItem>
                  <SelectItem value="6">6 (Large Group)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select
                onValueChange={(val: any) => form.setValue("difficulty", val)}
                defaultValue={form.watch("difficulty")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (Beginner)</SelectItem>
                  <SelectItem value="medium">Medium (Intermediate)</SelectItem>
                  <SelectItem value="hard">Hard (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Session Visibility</Label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: "public", icon: Globe, label: "Public", desc: "Anyone can join" },
                { id: "invite", icon: Users, label: "Invite Only", desc: "Via link" },
                { id: "private", icon: Lock, label: "Private", desc: "Host approval" },
              ].map((opt) => {
                const isSelected = form.watch("visibility") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => form.setValue("visibility", opt.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:bg-accent",
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/50"
                    )}
                  >
                    <opt.icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full bg-gradient-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            Publish Session
          </Button>
        </form>
      </div>
    </div>
  );
}
