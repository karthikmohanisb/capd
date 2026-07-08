"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttendanceActions } from "@/app/admin/events/attendance-actions";
import { cancelEvent, deleteEvent } from "@/lib/events/actions";

interface EventDetailModalProps {
  isOpen: boolean;
  event: any;
  sessionData?: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export function EventDetailModal({ isOpen, event, sessionData, onClose, onRefresh }: EventDetailModalProps) {
  const [pending, startTransition] = useTransition();

  if (!isOpen || !event) return null;

  const handleDelete = () => {
    if (window.confirm("Delete this event permanently?")) {
      startTransition(async () => {
        await deleteEvent(event.id);
        onRefresh?.();
        onClose();
      });
    }
  };

  const handleCancel = () => {
    if (window.confirm("Cancel this event?")) {
      startTransition(async () => {
        await cancelEvent(event.id);
        onRefresh?.();
        onClose();
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{event.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{event.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            {event.status === "published" && <Badge tone="success">Published</Badge>}
            {event.status === "draft" && <Badge tone="warning">Draft</Badge>}
            {event.status === "cancelled" && <Badge tone="neutral">Cancelled</Badge>}
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-2 gap-4">
            {event.event_at && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Date & Time</p>
                <p className="text-sm text-foreground">{new Date(event.event_at).toLocaleString()}</p>
              </div>
            )}
            {event.location && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Location</p>
                <p className="text-sm text-foreground">{event.location}</p>
              </div>
            )}
            {event.category && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Category</p>
                <p className="text-sm text-foreground">{event.category}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Audience</p>
              <p className="text-sm text-foreground">
                {event.audience_type === "all" && "Everyone"}
                {event.audience_type === "cohort" && `Cohort: ${event.cohort_name || "Unknown"}`}
                {event.audience_type === "custom" && "Custom list"}
              </p>
            </div>
          </div>

          {/* Attendance Section */}
          {event.attendance_session_id && sessionData && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-foreground mb-4">Attendance Management</h3>
              <AttendanceActions
                sessionId={event.attendance_session_id}
                sessionStatus={sessionData.status}
                sessionSecret={sessionData.session_secret}
                codeInterval={sessionData.code_interval_seconds}
              />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6 flex gap-3">
            {event.status !== "cancelled" && (
              <Button
                variant="danger"
                className="px-3 py-2 text-xs"
                loading={pending}
                onClick={handleCancel}
              >
                Cancel Event
              </Button>
            )}
            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              loading={pending}
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
