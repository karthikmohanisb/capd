"use client";

import { useMemo, useState, useTransition } from "react";
import { resetStudentPin } from "@/lib/students/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StudentRow {
  id: string;
  email: string;
  full_name: string | null;
  student_number: string | null;
  status: "active" | "disabled";
}

export function StudentList({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tempPasscodes, setTempPasscodes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          s.full_name?.toLowerCase().includes(q) ||
          s.student_number?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [students, search]);

  function handleReset(studentId: string) {
    setPendingId(studentId);
    setErrors((prev) => ({ ...prev, [studentId]: "" }));
    startTransition(async () => {
      const result = await resetStudentPin(studentId);
      setPendingId(null);
      if (result?.error) {
        setErrors((prev) => ({ ...prev, [studentId]: result.error! }));
      } else if (result?.tempPasscode) {
        setTempPasscodes((prev) => ({ ...prev, [studentId]: result.tempPasscode! }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Search by name, email, or student number"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {search.trim() === "" && (
        <p className="text-sm text-muted">Type to search {students.length} student(s).</p>
      )}

      {search.trim() !== "" && filtered.length === 0 && (
        <p className="text-sm text-muted">No students match.</p>
      )}

      {filtered.map((student) => (
        <Card key={student.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">
                {student.full_name || student.email}
              </p>
              <p className="text-sm text-muted">{student.email}</p>
              {student.student_number && (
                <p className="text-xs text-muted">#{student.student_number}</p>
              )}
            </div>
            {student.status === "disabled" && <Badge tone="danger">Disabled</Badge>}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-fit px-3 py-1.5 text-xs"
            loading={pendingId === student.id}
            onClick={() => {
              if (
                window.confirm(
                  `Reset ${student.full_name || student.email}'s PIN? They'll need the new temporary code to log in again.`
                )
              ) {
                handleReset(student.id);
              }
            }}
          >
            Reset PIN
          </Button>

          {errors[student.id] && <p className="text-xs text-danger">{errors[student.id]}</p>}

          {tempPasscodes[student.id] && (
            <p className="rounded-card bg-success-surface px-3 py-2 text-xs text-success">
              New temporary code: <span className="font-mono font-semibold">{tempPasscodes[student.id]}</span>
              {" "}— share this with the student. They&apos;ll set a new PIN on next login.
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
