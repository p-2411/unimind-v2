"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { MastifyWordmark } from "~/components/logo";
import { Raccoon } from "~/components/raccoon";
import { signOut } from "~/lib/auth-client";
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

const items = [
  { title: "Dashboard", url: "/", icon: LayoutGrid },
  { title: "Questions", url: "/questions", icon: ListOrdered },
  { title: "Problems", url: "/problems", icon: Code2 },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Groups", url: "/groups", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Admin", url: "/admin", icon: ShieldAlert },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-[color:var(--color-rule)] bg-[color:var(--color-void)]">
      <SidebarHeader>
        <div className="px-3 pt-5 pb-3">
          <MastifyWordmark className="h-7 w-auto text-[color:var(--color-phosphor)]" />
          <div className="mt-1 font-sans text-[10.5px] text-[color:var(--color-fg-mute)]">
            CS practice
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
                          : "border-transparent text-[color:var(--color-fg-soft)] transition-[border-color,color,background-color] duration-150 hover:border-[color:var(--color-phosphor)]/40 hover:bg-[color:var(--color-panel)]/70 hover:text-[color:var(--color-fg)]",
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
        <div className="mx-3 mb-1 border-t border-[color:var(--color-rule)]" />
        <div className="flex items-end gap-2.5 px-3 py-1.5">
          <Raccoon mood="idle" size={40} />
          <div className="mb-1">
            <div className="font-mono text-[10px] font-medium text-[color:var(--color-phosphor)]">Mastify</div>
            <div className="font-mono text-[9px] text-[color:var(--color-fg-mute)]">CS practice companion</div>
          </div>
        </div>
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
  async function onSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <SidebarMenuButton
      onClick={onSignOut}
      className="h-9 rounded-none border-l-2 border-transparent pl-3 font-sans text-[13.5px] text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-panel)]/70 hover:text-[color:var(--color-red)]"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
      <span>Sign out</span>
    </SidebarMenuButton>
  );
}
