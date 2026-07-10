"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { inspectImportFile } from "@/lib/import/actions";
import { matchStudentsByEmail } from "@/lib/audience/actions";
import { Input } from "@/components/ui/input";

interface Cohort {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  email: string;
  full_name: string | null;
  cohort_id?: string | null;
}

// Reusable "who is this for" picker — emits plain form fields
// (audience_type, cohort_id, student_ids[]) so any parent <form> reads them
// the same way regardless of whether it's an attendance session, a
// notification, or an event.
export function AudiencePicker({
  cohorts,
  students,
}: {
  cohorts: Cohort[];
  students: StudentOption[];
}) {
  const [uiMode, setUiMode] = useState<"all" | "cohort" | "custom">("all");
  const [selectedCohortIds, setSelectedCohortIds] = useState<Set<string>>(new Set());
  const [customMode, setCustomMode] = useState<"search" | "upload">("search");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => s.email.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q))
      .slice(0, 50);
  }, [students, search]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCohort(id: string) {
    setSelectedCohortIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // A single cohort keeps using the existing "cohort" audience path (live
  // membership, tracks changes automatically). Two or more cohorts fall back
  // to the "custom" path with a frozen snapshot of every member at creation
  // time — same mechanism as the search/upload picker below, just reusing
  // it rather than adding a new audience type end-to-end.
  const effectiveAudienceType: "all" | "cohort" | "custom" =
    uiMode === "cohort" && selectedCohortIds.size > 1 ? "custom" : uiMode;
  const cohortStudentIds =
    uiMode === "cohort" && selectedCohortIds.size > 1
      ? students.filter((s) => s.cohort_id && selectedCohortIds.has(s.cohort_id)).map((s) => s.id)
      : [];
  const singleCohortId =
    uiMode === "cohort" && selectedCohortIds.size === 1 ? [...selectedCohortIds][0] : "";

  async function handleRosterUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);
    const inspected = await inspectImportFile(undefined, formData);

    if (!inspected.sheets) {
      setUploadStatus(inspected.error ?? "Could not read that file.");
      setUploading(false);
      return;
    }

    const sheet = inspected.sheets[0];
    const emailCol = sheet.detected.emailCol;
    if (emailCol < 0) {
      setUploadStatus("Could not find an email column in that file.");
      setUploading(false);
      return;
    }

    const emails = sheet.rows.map((r) => r[emailCol] ?? "").filter(Boolean);
    const result = await matchStudentsByEmail(emails);
    setSelectedIds(new Set(result.matchedIds));
    setUploadStatus(
      `Matched ${result.matchedIds.length} of ${emails.length} students.` +
        (result.unmatchedEmails.length > 0
          ? ` ${result.unmatchedEmails.length} email(s) weren't found — they must already exist as students.`
          : "")
    );
    setUploading(false);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-border p-3">
      <legend className="px-1 text-sm font-medium text-foreground">Audience</legend>

      <input type="hidden" name="audience_type" value={effectiveAudienceType} />
      {singleCohortId && <input type="hidden" name="cohort_id" value={singleCohortId} />}
      {cohortStudentIds.map((id) => (
        <input key={id} type="hidden" name="student_ids" value={id} />
      ))}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input type="radio" checked={uiMode === "all"} onChange={() => setUiMode("all")} />
          Everyone
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input type="radio" checked={uiMode === "cohort"} onChange={() => setUiMode("cohort")} />
          One or more cohorts
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input type="radio" checked={uiMode === "custom"} onChange={() => setUiMode("custom")} />
          Custom list
        </label>
      </div>

      {uiMode === "cohort" && (
        <div className="flex flex-col gap-1">
          {cohorts.map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="checkbox"
                checked={selectedCohortIds.has(c.id)}
                onChange={() => toggleCohort(c.id)}
              />
              {c.name}
            </label>
          ))}
          {selectedCohortIds.size > 0 && (
            <p className="text-xs text-muted">
              {cohortStudentIds.length} student(s)
              {selectedCohortIds.size > 1 && ` across ${selectedCohortIds.size} cohorts`}
              {selectedCohortIds.size > 1 && ". Membership is captured now — students added to these cohorts later won't be included automatically."}
            </p>
          )}
          {selectedCohortIds.size === 0 && (
            <p className="text-xs text-danger">Choose at least one cohort.</p>
          )}
        </div>
      )}

      {uiMode === "custom" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-4 text-xs">
            <button
              type="button"
              className={customMode === "search" ? "font-semibold text-primary" : "text-muted"}
              onClick={() => setCustomMode("search")}
            >
              Search students
            </button>
            <button
              type="button"
              className={customMode === "upload" ? "font-semibold text-primary" : "text-muted"}
              onClick={() => setCustomMode("upload")}
            >
              Upload a roster file
            </button>
          </div>

          {customMode === "search" && (
            <>
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 py-1 text-sm text-foreground">
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggle(s.id)} />
                    {s.full_name ? `${s.full_name} — ${s.email}` : s.email}
                  </label>
                ))}
              </div>
            </>
          )}

          {customMode === "upload" && (
            <>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleRosterUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted">Matching students…</p>}
              {uploadStatus && <p className="text-xs text-muted">{uploadStatus}</p>}
            </>
          )}

          <p className="text-xs text-muted">{selectedIds.size} student(s) selected</p>
          {[...selectedIds].map((id) => (
            <input key={id} type="hidden" name="student_ids" value={id} />
          ))}
        </div>
      )}
    </fieldset>
  );
}
