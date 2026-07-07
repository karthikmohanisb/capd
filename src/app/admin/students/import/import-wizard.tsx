"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  inspectImportFile,
  importStudentsBatch,
  finalizeImportLog,
  createCohort,
  type InspectedSheet,
} from "@/lib/import/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";

const CHUNK_SIZE = 20;
const NONE_COLUMN = "-1";

type Step = "upload" | "configure" | "importing" | "done";

interface Cohort {
  id: string;
  name: string;
}

interface Totals {
  valid: number;
  invalid: number;
  inserted: number;
  updated: number;
}

export function ImportWizard({ initialCohorts }: { initialCohorts: Cohort[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filename, setFilename] = useState("");
  const [sheets, setSheets] = useState<InspectedSheet[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);

  const [emailCol, setEmailCol] = useState(-1);
  const [nameCol, setNameCol] = useState(-1);
  const [studentIdCol, setStudentIdCol] = useState(-1);

  const [cohorts, setCohorts] = useState<Cohort[]>(initialCohorts);
  const [cohortId, setCohortId] = useState("");
  const [newCohortName, setNewCohortName] = useState("");
  const [creatingCohort, setCreatingCohort] = useState(false);

  const [tempPasscode, setTempPasscode] = useState("");

  const [processed, setProcessed] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [totals, setTotals] = useState<Totals>({ valid: 0, invalid: 0, inserted: 0, updated: 0 });
  const [invalidRows, setInvalidRows] = useState<{ row: number; reason: string }[]>([]);
  const cancelRef = useRef(false);

  const sheet = sheets[sheetIdx];

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await inspectImportFile(undefined, formData);

    setUploading(false);

    if (!result.sheets) {
      setError(result.error);
      return;
    }

    setFilename(result.filename);
    setSheets(result.sheets);
    applySheet(result.sheets, 0);
    setStep("configure");
  }

  function applySheet(sheetList: InspectedSheet[], idx: number) {
    setSheetIdx(idx);
    const detected = sheetList[idx].detected;
    setEmailCol(detected.emailCol);
    setNameCol(detected.nameCol);
    setStudentIdCol(detected.studentIdCol);
  }

  async function handleCreateCohort() {
    setCreatingCohort(true);
    setError(null);
    const result = await createCohort(newCohortName);
    setCreatingCohort(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.cohort) {
      setCohorts((prev) => [...prev, result.cohort!]);
      setCohortId(result.cohort.id);
      setNewCohortName("");
    }
  }

  async function startImport() {
    if (emailCol < 0) {
      setError("Choose which column contains the email address.");
      return;
    }
    if (tempPasscode.trim().length < 6) {
      setError("Set a temporary passcode of at least 6 characters.");
      return;
    }

    setError(null);
    cancelRef.current = false;
    setStep("importing");
    setProcessed(0);
    setTotalRows(sheet.rows.length);

    let cumulative: Totals = { valid: 0, invalid: 0, inserted: 0, updated: 0 };
    const allInvalidRows: { row: number; reason: string }[] = [];

    for (let i = 0; i < sheet.rows.length; i += CHUNK_SIZE) {
      if (cancelRef.current) break;

      const chunk = sheet.rows.slice(i, i + CHUNK_SIZE);
      const result = await importStudentsBatch(
        chunk,
        emailCol,
        nameCol,
        studentIdCol,
        cohortId || null,
        tempPasscode
      );

      if (result.error) {
        setError(result.error);
        setStep("configure");
        return;
      }

      cumulative = {
        valid: cumulative.valid + result.valid,
        invalid: cumulative.invalid + result.invalid,
        inserted: cumulative.inserted + result.inserted,
        updated: cumulative.updated + result.updated,
      };
      allInvalidRows.push(...result.invalidRows.map((r) => ({ ...r, row: r.row + i })));

      setProcessed(Math.min(i + CHUNK_SIZE, sheet.rows.length));
      setTotals(cumulative);
      setInvalidRows(allInvalidRows);
    }

    await finalizeImportLog(filename, cumulative);
    setStep("done");
  }

  if (step === "upload") {
    return (
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Upload an Excel (.xlsx) or CSV file containing student names and emails.
        </p>
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={uploading} />
        {uploading && <p className="text-sm text-muted">Reading file…</p>}
        <FormError message={error ?? undefined} />
      </Card>
    );
  }

  if (step === "configure" && sheet) {
    return (
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          File: <span className="font-medium text-foreground">{filename}</span> ·{" "}
          {sheet.rows.length} row(s) in this sheet
        </p>

        {sheets.length > 1 && (
          <Field label="Sheet" htmlFor="sheet">
            <Select
              id="sheet"
              value={sheetIdx}
              onChange={(e) => applySheet(sheets, Number(e.target.value))}
            >
              {sheets.map((s, i) => (
                <option key={s.name} value={i}>
                  {s.name} ({s.rows.length} rows)
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Email column" htmlFor="emailCol">
          <Select id="emailCol" value={emailCol} onChange={(e) => setEmailCol(Number(e.target.value))}>
            <option value={NONE_COLUMN}>Select a column…</option>
            {sheet.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `Column ${i + 1}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Name column (optional)" htmlFor="nameCol">
          <Select id="nameCol" value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))}>
            <option value={NONE_COLUMN}>None</option>
            {sheet.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `Column ${i + 1}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Student ID column (optional)" htmlFor="studentIdCol">
          <Select id="studentIdCol" value={studentIdCol} onChange={(e) => setStudentIdCol(Number(e.target.value))}>
            <option value={NONE_COLUMN}>None</option>
            {sheet.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `Column ${i + 1}`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cohort (optional)" htmlFor="cohort">
          <Select id="cohort" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">No cohort</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-2">
          <Input
            placeholder="New cohort name"
            value={newCohortName}
            onChange={(e) => setNewCohortName(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            loading={creatingCohort}
            onClick={handleCreateCohort}
            className="shrink-0"
          >
            Add
          </Button>
        </div>

        <Field label="Temporary passcode for new students" htmlFor="tempPasscode">
          <Input
            id="tempPasscode"
            value={tempPasscode}
            onChange={(e) => setTempPasscode(e.target.value)}
            placeholder="Shared with everyone in this file (min 6 characters)"
          />
        </Field>

        <FormError message={error ?? undefined} />

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setStep("upload")} className="flex-1">
            Back
          </Button>
          <Button type="button" onClick={startImport} className="flex-1">
            Start import
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "importing") {
    const pct = totalRows ? Math.round((processed / totalRows) * 100) : 0;
    return (
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-foreground">
          Importing… {processed} / {totalRows}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted-surface">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-6 text-sm text-muted">
          <span>Valid: {totals.valid}</span>
          <span>Inserted: {totals.inserted}</span>
          <span>Updated: {totals.updated}</span>
          <span>Invalid: {totals.invalid}</span>
        </div>
        <Button
          type="button"
          variant="danger"
          className="w-fit"
          onClick={() => {
            cancelRef.current = true;
          }}
        >
          Stop
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="font-medium text-success">Import finished.</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-lg font-semibold text-foreground">{totals.valid}</p>
          <p className="text-muted">Valid rows</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{totals.invalid}</p>
          <p className="text-muted">Invalid rows</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{totals.inserted}</p>
          <p className="text-muted">New students</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{totals.updated}</p>
          <p className="text-muted">Updated students</p>
        </div>
      </div>

      {invalidRows.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-card border border-border p-3 text-xs text-muted">
          {invalidRows.map((r, i) => (
            <p key={i}>
              Row {r.row + 2}: {r.reason}
            </p>
          ))}
        </div>
      )}

      <p className="text-sm text-muted">
        New students log in with their email and the temporary passcode you set, then create their own
        PIN.
      </p>

      <Link href="/admin/students" className="text-sm font-medium text-primary hover:underline">
        Back to Students
      </Link>
    </Card>
  );
}
