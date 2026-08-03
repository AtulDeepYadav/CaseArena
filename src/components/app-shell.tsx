import type { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Brain,
  FolderKanban,
  Globe2,
  CalendarPlus,
  CalendarSearch,
  CalendarCheck,
  Bookmark,
  Bell,
  User,
  Settings,
  Trophy,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Trainer", url: "/trainer", icon: Brain },
  { title: "Repository", url: "/repository", icon: FolderKanban },
  { title: "Community", url: "/community", icon: Globe2 },
];

const sessionNav = [
  { title: "Host Session", url: "/sessions/host", icon: CalendarPlus },
  { title: "Join Session", url: "/sessions", icon: CalendarSearch },
  { title: "My Sessions", url: "/sessions/mine", icon: CalendarCheck },
];

const personalNav = [
  { title: "Bookmarks", url: "/bookmarks", icon: Bookmark },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

function NavGroup({
  label,
  items,
  pathname,
  unread,
}: {
  label: string;
  items: { title: string; url: string; icon: typeof Brain }[];
  pathname: string;
  unread?: number;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
              >
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.url === "/notifications" && !!unread && (
                    <Badge className="ml-auto h-5 px-1.5 text-[10px]">{unread}</Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name ?? profile?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full surface-aurora">
        <Sidebar collapsible="icon">
          <SidebarContent className="scrollbar-slim">
            <div className="px-4 py-4 font-display text-base font-bold">
              Case<span className="text-gradient">Arena</span>
            </div>
            <NavGroup label="Prepare" items={mainNav} pathname={pathname} />
            <NavGroup label="Sessions" items={sessionNav} pathname={pathname} />
            <NavGroup label="You" items={personalNav} pathname={pathname} unread={unread} />
            {isAdmin && (
              <NavGroup
                label="Admin"
                items={[{ title: "Admin Console", url: "/admin", icon: ShieldCheck }]}
                pathname={pathname}
              />
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 glass px-3">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {profile?.xp ?? 0} XP
              </Badge>
              <ThemeToggle />
              <Link to="/profile">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
