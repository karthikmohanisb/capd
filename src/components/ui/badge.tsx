type Tone = "neutral" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted-surface text-muted",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger-surface text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
