export function generateAttendanceCSV(
  records: { profiles: { full_name: string; email: string } }[],
  eventTitle: string
): string {
  const headers = ["Name", "Email"];
  const rows = records.map((record) => [
    record.profiles.full_name,
    record.profiles.email,
  ]);

  const csvContent = [
    [`Attendance Report: ${eventTitle}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
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
