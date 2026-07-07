"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSpreadsheet, detectColumns, type DetectedColumns } from "./parse";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InspectedSheet {
  name: string;
  headers: string[];
  rows: string[][];
  detected: DetectedColumns;
}

export type InspectResult =
  | { error: string; filename?: undefined; sheets?: undefined }
  | { error?: undefined; filename: string; sheets: InspectedSheet[] };

export async function inspectImportFile(
  _prev: InspectResult | undefined,
  formData: FormData
): Promise<InspectResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 5MB)." };
  }

  const buffer = await file.arrayBuffer();

  let sheets;
  try {
    sheets = await parseSpreadsheet(buffer, file.name);
  } catch {
    return { error: "Could not read that file. Make sure it's a valid .xlsx or .csv file." };
  }

  const nonEmptySheets = sheets.filter((s) => s.rows.length > 0 && s.headers.length > 0);
  if (nonEmptySheets.length === 0) {
    return { error: "No data found in that file." };
  }

  return {
    filename: file.name,
    sheets: nonEmptySheets.map((s) => ({ ...s, detected: detectColumns(s.headers) })),
  };
}

export interface ImportBatchResult {
  error?: string;
  valid: number;
  invalid: number;
  inserted: number;
  updated: number;
  invalidRows: { row: number; reason: string }[];
}

export async function importStudentsBatch(
  rows: string[][],
  emailCol: number,
  nameCol: number,
  studentIdCol: number,
  cohortId: string | null,
  tempPasscode: string
): Promise<ImportBatchResult> {
  await requireAdmin();

  const result: ImportBatchResult = {
    valid: 0,
    invalid: 0,
    inserted: 0,
    updated: 0,
    invalidRows: [],
  };

  if (tempPasscode.trim().length < 6) {
    return { ...result, error: "Temporary passcode must be at least 6 characters." };
  }
  if (emailCol < 0) {
    return { ...result, error: "No email column selected." };
  }

  const admin = createAdminClient();

  const candidates: {
    email: string;
    fullName: string | null;
    studentNumber: string | null;
    rowIndex: number;
  }[] = [];

  rows.forEach((row, i) => {
    const email = (row[emailCol] ?? "").trim().toLowerCase();
    const fullName = nameCol >= 0 ? (row[nameCol] ?? "").trim() || null : null;
    const studentNumber = studentIdCol >= 0 ? (row[studentIdCol] ?? "").trim() || null : null;

    if (!email || !EMAIL_REGEX.test(email)) {
      result.invalid += 1;
      result.invalidRows.push({ row: i, reason: !email ? "Missing email" : "Invalid email format" });
      return;
    }

    result.valid += 1;
    candidates.push({ email, fullName, studentNumber, rowIndex: i });
  });

  if (candidates.length === 0) {
    return result;
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id, email")
    .in(
      "email",
      candidates.map((c) => c.email)
    );

  const existingByEmail = new Map((existing ?? []).map((p) => [p.email, p.id]));

  for (const candidate of candidates) {
    const existingId = existingByEmail.get(candidate.email);

    if (existingId) {
      const { error } = await admin
        .from("profiles")
        .update({
          full_name: candidate.fullName,
          student_number: candidate.studentNumber,
          cohort_id: cohortId,
        })
        .eq("id", existingId);

      if (error) {
        result.invalid += 1;
        result.valid -= 1;
        result.invalidRows.push({ row: candidate.rowIndex, reason: "Could not update existing student." });
      } else {
        result.updated += 1;
      }
      continue;
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: candidate.email,
      password: tempPasscode,
      email_confirm: true,
    });

    if (createError || !created.user) {
      result.invalid += 1;
      result.valid -= 1;
      result.invalidRows.push({
        row: candidate.rowIndex,
        reason: createError?.message ?? "Could not create account.",
      });
      continue;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      email: candidate.email,
      full_name: candidate.fullName,
      student_number: candidate.studentNumber,
      role: "student",
      status: "active",
      must_set_pin: true,
      cohort_id: cohortId,
    });

    if (profileError) {
      result.invalid += 1;
      result.valid -= 1;
      result.invalidRows.push({ row: candidate.rowIndex, reason: "Account created but profile save failed." });
    } else {
      result.inserted += 1;
    }
  }

  return result;
}

export async function finalizeImportLog(
  filename: string,
  counts: { valid: number; invalid: number; inserted: number; updated: number }
) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("student_import_log").insert({
    admin_id: admin.id,
    filename,
    valid_count: counts.valid,
    invalid_count: counts.invalid,
    inserted_count: counts.inserted,
    updated_count: counts.updated,
  });
}

export async function createCohort(
  name: string
): Promise<{ error?: string; cohort?: { id: string; name: string } }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Enter a cohort name." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cohorts")
    .insert({ name: trimmed })
    .select("id, name")
    .single();

  if (error) {
    return {
      error: error.code === "23505" ? "A cohort with that name already exists." : "Could not create cohort.",
    };
  }

  return { cohort: data };
}
