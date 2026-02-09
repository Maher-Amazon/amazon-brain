"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  Megaphone,
  Target,
  History,
  Users,
  Settings,
  Brain,
  Search,
  Calendar,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Brands", href: "/brands", icon: Store },
  { name: "Products", href: "/products", icon: Package },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Search Terms", href: "/search-terms", icon: Search },
];

const management = [
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Promos", href: "/promos", icon: Tag },
  { name: "Decisions", href: "/decisions", icon: History },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Brain className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">Amazon Brain</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Management
          </p>
          {management.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">
            Last sync: 2 hours ago
          </p>
          <Button variant="link" className="h-auto p-0 text-xs">
            Sync now
          </Button>
        </div>
      </div>
    </div>
  );
}
