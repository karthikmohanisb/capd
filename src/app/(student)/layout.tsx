import { requireStudent } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";
import { StudentNav } from "./student-nav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudent();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="safe-top flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <span className="text-sm font-semibold text-foreground">CAPD</span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <StudentNav />
    </div>
  );
}
