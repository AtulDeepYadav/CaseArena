import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Welcome to CaseArena" }],
  }),
  component: OnboardingPage,
});

const DOMAINS = [
  "Marketing", "Operations", "Consulting", "Finance", "IT", "HRM", "General Management", "Entrepreneurship"
];

const onboardingSchema = z.object({
  batch: z.enum(["PGP 1", "PGP 2"]),
  active_time: z.enum(["Morning", "Afternoon", "Evening", "Late Night"]),
  preferred_domains: z.array(z.string()).min(1, "Select at least one domain"),
  etrigan_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  onboarding_answers: z.object({
    background: z.string().min(10, "Tell us a bit more about your background"),
    goals: z.string().min(10, "What are your placement goals?"),
  })
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

function OnboardingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      batch: "PGP 1",
      active_time: "Evening",
      preferred_domains: [],
      etrigan_url: "",
      linkedin_url: "",
      onboarding_answers: { background: "", goals: "" },
    },
  });

  const onSubmit = async (data: OnboardingValues) => {
    if (!session?.user.id) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('profiles').update({
        batch: data.batch,
        active_time: data.active_time,
        preferred_domains: data.preferred_domains,
        etrigan_url: data.etrigan_url || null,
        linkedin_url: data.linkedin_url || null,
        onboarding_answers: data.onboarding_answers,
        onboarding_completed: true,
      }).eq('id', session.user.id);

      if (error) throw error;
      
      toast.success("Profile completely setup!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Failed to save profile details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate current step fields before moving on
    setStep(prev => prev + 1);
  };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to CaseArena</h1>
        <p className="text-muted-foreground">Let's set up your profile so we can match you with the perfect peers.</p>
      </div>

      <div className="rounded-3xl glass p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">1. Academic & Availability</h2>
              
              <div className="space-y-3">
                <Label>Which batch are you in?</Label>
                <Select onValueChange={(v) => form.setValue("batch", v as "PGP 1" | "PGP 2")} defaultValue={form.getValues("batch")}>
                  <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PGP 1">PGP 1</SelectItem>
                    <SelectItem value="PGP 2">PGP 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>When are you mostly active for case prep?</Label>
                <Select onValueChange={(v) => form.setValue("active_time", v as any)} defaultValue={form.getValues("active_time")}>
                  <SelectTrigger><SelectValue placeholder="Select Time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Late Night">Late Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="button" onClick={nextStep} className="w-full">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">2. Domain Preferences</h2>
              
              <div className="space-y-3">
                <Label>Select all domains you are interested in (Marketing, Consulting, etc.)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {DOMAINS.map(domain => (
                    <div key={domain} className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg border">
                      <Checkbox 
                        id={domain} 
                        onCheckedChange={(checked) => {
                          const current = form.getValues("preferred_domains");
                          if (checked) form.setValue("preferred_domains", [...current, domain]);
                          else form.setValue("preferred_domains", current.filter(d => d !== domain));
                        }}
                      />
                      <label htmlFor={domain} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {domain}
                      </label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.preferred_domains && (
                  <p className="text-sm text-destructive">{form.formState.errors.preferred_domains.message}</p>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                <Button type="button" onClick={nextStep} className="w-2/3">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">3. Profiles & Goals</h2>
              
              <div className="space-y-3">
                <Label>Etrigan Profile URL (Optional)</Label>
                <Input placeholder="https://etrigan..." {...form.register("etrigan_url")} />
              </div>

              <div className="space-y-3">
                <Label>LinkedIn URL (Optional)</Label>
                <Input placeholder="https://linkedin.com/in/..." {...form.register("linkedin_url")} />
              </div>

              <div className="space-y-3">
                <Label>Briefly describe your pre-MBA background</Label>
                <Textarea placeholder="E.g. 2 years in software engineering at Google..." {...form.register("onboarding_answers.background")} />
                {form.formState.errors.onboarding_answers?.background && (
                  <p className="text-sm text-destructive">{form.formState.errors.onboarding_answers.background.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>What are your placement goals?</Label>
                <Textarea placeholder="E.g. Front-end consulting at MBB..." {...form.register("onboarding_answers.goals")} />
                {form.formState.errors.onboarding_answers?.goals && (
                  <p className="text-sm text-destructive">{form.formState.errors.onboarding_answers.goals.message}</p>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-1/3">Back</Button>
                <Button type="submit" disabled={isSubmitting} className="w-2/3">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Complete Profile
                </Button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
