import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CaseArena" },
      { name: "description", content: "Sign in or create your CaseArena case prep account." },
      { property: "og:title", content: "Sign in — CaseArena" },
      {
        property: "og:description",
        content: "Access your AI case trainer, repository and prep sessions.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "verify" | "reset">(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        return;
      }

      const parsedPassword = passwordSchema.safeParse(password);
      if (!parsedPassword.success) throw new Error(parsedPassword.error.issues[0].message);

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password: parsedPassword.data,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim() || parsedEmail.data.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("verify");
          return;
        }
        toast.success("Welcome to CaseArena");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center surface-aurora px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl glass-strong p-8"
      >
        <Link to="/" className="font-display text-lg font-bold">
          Case<span className="text-gradient">Arena</span>
        </Link>

        {sent ? (
          <div className="mt-8 text-center">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">
              {sent === "verify" ? "Verify your email" : "Check your inbox"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a link to <span className="font-medium text-foreground">{email}</span>.{" "}
              {sent === "verify"
                ? "Confirm it to activate your account, then sign in."
                : "Follow it to set a new password."}
            </p>
            <Button
              variant="ghost"
              className="mt-6"
              onClick={() => {
                setSent(null);
                setMode("login");
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold">
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "forgot"
                ? "We'll email you a secure reset link."
                : "Case practice, repository and cohort sessions in one place."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    maxLength={80}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aditi Sharma"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@iiml.ac.in"
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setMode("forgot")}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}

              <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
              </Button>
            </form>

            {mode !== "forgot" && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or{" "}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
                  Continue with Google
                </Button>
              </>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New to CaseArena?"}{" "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
