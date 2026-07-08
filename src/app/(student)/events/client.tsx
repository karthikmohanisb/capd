"use client";

import { useState, useCallback } from "react";
import { StudentCalendar } from "@/components/student-calendar";
import { StudentAttendanceModal } from "@/components/student-attendance-modal";
import { createClient } from "@/lib/supabase/client";

type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  event_at: string | null;
  attendance_session_id: string | null;
};

interface StudentEventsClientProps {
  events: Event[];
}

export function StudentEventsClient({ events }: StudentEventsClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);

  const handleEventClick = useCallback(
    async (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event && event.attendance_session_id) {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: record } = await supabase
            .from("attendance_records")
            .select("id")
            .eq("session_id", event.attendance_session_id)
            .eq("student_id", user.id)
            .maybeSingle();

          setIsAlreadyMarked(Boolean(record));
        }
      }

      setSelectedEvent(event || null);
      setIsAttendanceOpen(!!event?.attendance_session_id);
    },
    [events]
  );

  const handleAttendanceSuccess = () => {
    setIsAlreadyMarked(true);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 pb-20">
      <div>
        <h1 className="text-xl font-bold text-foreground">📅 Events</h1>
        <p className="text-sm text-gray-600 mt-1">{events.length} upcoming events</p>
      </div>

      <StudentCalendar events={events} onEventClick={handleEventClick} />

      {selectedEvent && (
        <StudentAttendanceModal
          isOpen={isAttendanceOpen}
          eventTitle={selectedEvent.title}
          sessionId={selectedEvent.attendance_session_id || ""}
          isAlreadyMarked={isAlreadyMarked}
          onClose={() => {
            setIsAttendanceOpen(false);
            setSelectedEvent(null);
          }}
          onSuccess={handleAttendanceSuccess}
        />
      )}
    </div>
  );
}
