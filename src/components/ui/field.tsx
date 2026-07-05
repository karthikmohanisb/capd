import { LabelHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  children,
  ...props
}: { label: string; htmlFor: string; children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground" {...props}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-card bg-danger-surface px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}
