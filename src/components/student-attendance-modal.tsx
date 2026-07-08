"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markAttendance, type MarkAttendanceState } from "@/lib/attendance/actions";
import { FormError } from "@/components/ui/field";

interface StudentAttendanceModalProps {
  isOpen: boolean;
  eventTitle: string;
  sessionId: string;
  isAlreadyMarked?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StudentAttendanceModal({
  isOpen,
  eventTitle,
  sessionId,
  isAlreadyMarked = false,
  onClose,
  onSuccess,
}: StudentAttendanceModalProps) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    const formData = new FormData();
    formData.set("session_id", sessionId);
    formData.set("code", code);

    startTransition(async () => {
      const result = await markAttendance(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || "Attendance marked!");
        setCode("");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Check In</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">{eventTitle}</p>

          {isAlreadyMarked ? (
            <div className="text-center py-6">
              <p className="text-lg font-semibold text-green-600">✓ You're checked in!</p>
              <p className="text-sm text-gray-600 mt-2">Attendance already marked for this event.</p>
              <Button onClick={onClose} className="mt-4 w-full">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  6-digit code
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  disabled={pending}
                  required
                  className="text-center font-mono text-2xl tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-2">Enter the code shown at the event</p>
              </div>

              <FormError message={error} />
              {success && <p className="text-sm font-medium text-green-600">{success}</p>}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={pending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" loading={pending} className="flex-1">
                  Submit
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
