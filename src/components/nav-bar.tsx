"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShoppingCart, BarChart3, Package, MessageSquare, BellRing, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/catalog", label: "Catálogo", icon: Package },
  { href: "/leads", label: "Leads", icon: MessageSquare },
  { href: "/remarketing", label: "Remarketing", icon: BellRing },
];

export function NavBar({
  user,
  pendingRemarketing,
}: {
  user: { name: string; role: string };
  pendingRemarketing: number;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center gap-1">
        <span className="mr-4 font-bold">🧾 Ventas</span>
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {href === "/remarketing" && pendingRemarketing > 0 && (
                  <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                    {pendingRemarketing}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {user.name} · <span className="capitalize">{user.role}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
