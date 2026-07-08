function splitName(fullName: string): { first: string; last: string } {
  const trimmed = (fullName || "").trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { first: trimmed, last: "" };
  return { first: trimmed.slice(0, spaceIndex), last: trimmed.slice(spaceIndex + 1) };
}

export function generateAttendanceCSV(
  eligibleStudents: { full_name: string | null; email: string }[],
  markedByEmail: Record<string, string>,
  eventTitle: string
): string {
  const headers = ["Full Name", "First Name", "Last Name", "Email", "Status", "Scanned At"];

  const rows = eligibleStudents
    .slice()
    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
    .map((student) => {
      const { first, last } = splitName(student.full_name || "");
      const scannedAt = markedByEmail[student.email];
      return [
        student.full_name || "",
        first,
        last,
        student.email,
        scannedAt ? "Present" : "Absent",
        scannedAt || "",
      ];
    });

  const csvContent = [
    [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))],
  ]
    .flat()
    .join("\n");

  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
