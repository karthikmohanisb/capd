"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Bell, BookOpen, Users } from "lucide-react";

const items = [
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/notifications", label: "Notify", icon: Bell },
  { href: "/admin/resources", label: "Resources", icon: BookOpen },
  { href: "/admin/students", label: "Students", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-border bg-surface">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
