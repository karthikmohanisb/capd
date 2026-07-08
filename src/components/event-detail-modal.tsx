"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceActions } from "@/app/admin/events/attendance-actions";
import { deleteEvent } from "@/lib/events/actions";
import { generateAttendanceCSV, downloadCSV } from "@/lib/attendance/export";

interface EventDetailModalProps {
  isOpen: boolean;
  event: any;
  sessionData?: any;
  attendanceRecords?: any[];
  onClose: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
}

export function EventDetailModal({
  isOpen,
  event,
  sessionData,
  attendanceRecords = [],
  onClose,
  onRefresh,
  onDelete,
}: EventDetailModalProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"draft" | "open" | "closed" | undefined>(sessionData?.status);

  useEffect(() => {
    setStatus(sessionData?.status);
  }, [sessionData?.status, event?.id]);

  if (!isOpen || !event) return null;

  const handleDelete = async () => {
    if (window.confirm("Delete this event permanently?")) {
      startTransition(async () => {
        await deleteEvent(event.id);
        onDelete?.();
        onRefresh?.();
        onClose();
      });
    }
  };

  const handleExportCSV = () => {
    const csv = generateAttendanceCSV(attendanceRecords, event.title);
    downloadCSV(csv, `${event.title}-attendance.csv`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Back Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Event Details</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Title & Info */}
          <div>
            <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {event.event_at && (
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{new Date(event.event_at).toLocaleDateString()}</span>
                </div>
              )}
              {event.event_at && (
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span>
                    {new Date(event.event_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Manage Attendance Section */}
          {event.attendance_session_id && sessionData && status && (
            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Manage Attendance</h3>

              {status === "draft" && (
                <p className="text-sm text-gray-500 mb-4 text-center">No active attendance session</p>
              )}

              <AttendanceActions
                sessionId={event.attendance_session_id}
                sessionStatus={status}
                sessionSecret={sessionData.session_secret}
                codeInterval={sessionData.code_interval_seconds}
                onStatusChange={setStatus}
              />

              {attendanceRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    {attendanceRecords.length} student{attendanceRecords.length !== 1 ? "s" : ""} checked in
                  </p>
                  <Button
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    Export Attendance
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Edit Button */}
          <div className="border-t pt-6">
            <Button variant="secondary" className="w-full mb-3">
              ✏️ Edit Event
            </Button>
          </div>

          {/* Delete Button */}
          <Button
            variant="danger"
            className="w-full"
            loading={pending}
            onClick={handleDelete}
          >
            🗑️ Delete Event
          </Button>
        </div>
      </div>
    </div>
  );
}
