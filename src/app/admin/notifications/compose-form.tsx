"use client";

import { useActionState, useMemo, useRef, useState, useEffect } from "react";
import { createNotification, type ActionState } from "@/lib/notifications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/ui/field";

interface StudentOption {
  id: string;
  email: string;
  full_name: string | null;
}

export function ComposeForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createNotification,
    undefined
  );
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSelectedIds(new Set());
      setAudience("all");
      setSendMode("now");
    }
  }, [state]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 50);
    return students
      .filter(
        (s) => s.email.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [students, search]);

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} placeholder="e.g. Attendance is open" />
      </Field>

      <Field label="Message" htmlFor="message">
        <Textarea id="message" name="message" required maxLength={500} rows={3} placeholder="Notification text" />
      </Field>

      <Field label="Link when tapped (optional)" htmlFor="deep_link">
        <Input id="deep_link" name="deep_link" placeholder="/attendance" />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-foreground">Send to</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="audience"
              value="all"
              checked={audience === "all"}
              onChange={() => setAudience("all")}
            />
            Everyone
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="audience"
              value="selected"
              checked={audience === "selected"}
              onChange={() => setAudience("selected")}
            />
            Selected students
          </label>
        </div>
      </fieldset>

      {audience === "selected" && (
        <div className="flex flex-col gap-2 rounded-card border border-border p-3">
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-xs text-muted">{selectedIds.size} selected</p>
          <div className="max-h-48 overflow-y-auto">
            {filteredStudents.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="student_ids"
                  value={s.id}
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleStudent(s.id)}
                />
                {s.full_name ? `${s.full_name} — ${s.email}` : s.email}
              </label>
            ))}
            {filteredStudents.length === 0 && (
              <p className="py-1 text-sm text-muted">No students match.</p>
            )}
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-foreground">When</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="send_mode"
              value="now"
              checked={sendMode === "now"}
              onChange={() => setSendMode("now")}
            />
            Send now
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="send_mode"
              value="schedule"
              checked={sendMode === "schedule"}
              onChange={() => setSendMode("schedule")}
            />
            Schedule for later
          </label>
        </div>
      </fieldset>

      {sendMode === "schedule" && (
        <div className="flex flex-col gap-1.5">
          <Input type="datetime-local" name="scheduled_at" required />
          <p className="text-xs text-warning">
            Scheduled notifications are checked once a day, so this may go out up to 24 hours
            after the time you pick. For anything time-sensitive, use &quot;Send now&quot;
            instead.
          </p>
        </div>
      )}

      <FormError message={state?.error} />
      {state?.success && <p className="text-sm font-medium text-success">{state.success}</p>}

      <Button type="submit" loading={pending} className="mt-2 w-full">
        {sendMode === "schedule" ? "Schedule notification" : "Send notification"}
      </Button>
    </form>
  );
}
