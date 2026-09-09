"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpenText,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Settings,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { UnimindLogo } from "~/components/logo";
import { useSupabase } from "~/components/providers/supabase-provider";
import { cn } from "~/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Not yet built — rendered as a disabled, non-navigating entry. */
  soon?: boolean;
};

const items: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutGrid },
  { title: "Questions", url: "/questions", icon: ListOrdered },
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Topics", url: "/topics", icon: BookOpenText, soon: true },
  { title: "Progress", url: "/progress", icon: TrendingUp, soon: true },
  { title: "Settings", url: "/settings", icon: Settings, soon: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-[color:var(--color-rule)] bg-[color:var(--color-void)]">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-3 pt-5 pb-3">
          <UnimindLogo className="h-7 w-7 text-[color:var(--color-phosphor)]" />
          <div className="leading-tight">
            <div className="font-mono text-[15px] font-semibold tracking-tight text-[color:var(--color-fg)]">
              Unimind
            </div>
            <div className="font-sans text-[10.5px] text-[color:var(--color-fg-mute)]">
              CS practice
            </div>
          </div>
        </div>
        <div className="mx-3 border-t border-[color:var(--color-rule)]" />
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.24em] text-[color:var(--color-fg-mute)] uppercase">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                if (item.soon) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        aria-disabled="true"
                        tabIndex={-1}
                        className="h-9 cursor-default rounded-none border-l-2 border-transparent pl-3 text-[color:var(--color-fg-mute)] aria-disabled:opacity-100"
                      >
                        <item.icon className="h-4 w-4" strokeWidth={1.75} />
                        <span className="font-sans text-[13.5px] tracking-tight">
                          {item.title}
                        </span>
                        <span className="ml-auto border border-[color:var(--color-rule-hi)] px-1.5 py-px font-mono text-[9px] tracking-[0.18em] text-[color:var(--color-fg-mute)] uppercase">
                          soon
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname === item.url ||
                      pathname?.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "group h-9 rounded-none border-l-2 pl-3 transition-colors",
                        active
                          ? "border-[color:var(--color-phosphor)] bg-[color:var(--color-panel)] text-[color:var(--color-fg)]"
                          : "border-transparent text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-panel)]/70 hover:text-[color:var(--color-fg)]",
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            active && "text-[color:var(--color-phosphor)]",
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="font-sans text-[13.5px] tracking-tight">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-3 mb-2 border-t border-[color:var(--color-rule)]" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SignOutButton() {
  const { supabase } = useSupabase();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        setIsPending(false);
        return;
      }

      window.location.assign("/login");
    } catch {
      setError("Unable to sign out. Check your connection and try again.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <SidebarMenuButton
        onClick={onSignOut}
        disabled={isPending}
        aria-busy={isPending}
        className="h-9 rounded-none border-l-2 border-transparent pl-3 font-sans text-[13.5px] text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-panel)]/70 hover:text-[color:var(--color-red)] disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
        <span>{isPending ? "Signing out…" : "Sign out"}</span>
      </SidebarMenuButton>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="px-3 pt-1 pb-2 font-sans text-[11px] leading-snug text-[color:var(--color-red)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
