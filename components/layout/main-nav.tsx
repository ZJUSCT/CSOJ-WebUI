"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CodeXml } from "lucide-react";

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const routes = [
    { href: "/contests", label: "Contests" },
    { href: "/submissions", label: "Submissions" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
       <Link href="/contests" className="flex items-center gap-2 font-semibold">
        <CodeXml className="h-6 w-6" />
        <span className="">CSOJ</span>
      </Link>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname.startsWith(route.href) ? "text-primary" : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}