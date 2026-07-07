import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
}

const EMAIL_HEADER_HINTS = ["email", "e-mail", "mail id", "mail-id"];
const NAME_HEADER_HINTS = ["full name", "name", "student name"];
// Deliberately no bare "id" hint — it substring-matches "ISB Email Id" and
// would misdetect the email column as the student ID column.
const STUDENT_ID_HEADER_HINTS = ["student id", "student number", "roll no"];

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    // exceljs hyperlink/rich-text cell shape
    return String((value as { text: unknown }).text ?? "");
  }
  return String(value).trim();
}

function detectColumn(headers: string[], hints: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h === hint);
    if (idx !== -1) return idx;
  }
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

export interface DetectedColumns {
  emailCol: number;
  nameCol: number;
  studentIdCol: number;
}

export function detectColumns(headers: string[]): DetectedColumns {
  const emailCol = detectColumn(headers, EMAIL_HEADER_HINTS);
  const nameCol = detectColumn(headers, NAME_HEADER_HINTS);
  let studentIdCol = detectColumn(headers, STUDENT_ID_HEADER_HINTS);
  // Never let two fields resolve to the same column.
  if (studentIdCol === emailCol || studentIdCol === nameCol) {
    studentIdCol = -1;
  }
  return { emailCol, nameCol, studentIdCol };
}

export async function parseSpreadsheet(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedSheet[]> {
  const isCsv = filename.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const text = new TextDecoder().decode(buffer);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const [headers, ...rows] = result.data;
    return [{ name: "CSV", headers: headers ?? [], rows }];
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  return workbook.worksheets
    .filter((sheet) => sheet.rowCount > 0)
    .map((sheet) => {
      const allRows: string[][] = [];
      sheet.eachRow((row) => {
        // exceljs Row.values is 1-indexed with a leading empty slot.
        const values = (row.values as unknown[]).slice(1).map(cellToString);
        allRows.push(values);
      });
      const [headers, ...rows] = allRows;
      return { name: sheet.name, headers: headers ?? [], rows };
    });
}
