"use client";

import { useState, useCallback } from "react";
import { WeekCalendarWithList } from "@/components/week-calendar-with-list";
import { EventDetailModal } from "@/components/event-detail-modal";
import { EventCreateModal } from "@/components/event-create-modal";
import { createEvent } from "@/lib/events/actions";

interface AdminEventsClientProps {
  initialEvents: any[];
  cohorts: any[];
  students: any[];
  sessionDataById: Record<string, any>;
  cohortNameById: Record<string, string>;
  attendanceBySession: Record<string, any[]>;
}

export function AdminEventsClient({
  initialEvents,
  cohorts,
  students,
  sessionDataById,
  cohortNameById,
  attendanceBySession,
}: AdminEventsClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [events, setEvents] = useState(initialEvents);
  const [sessions, setSessions] = useState(sessionDataById);

  const handleEventClick = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        const attendanceRecords = event.attendance_session_id
          ? attendanceBySession[event.attendance_session_id] || []
          : [];

        setSelectedEvent({
          ...event,
          cohort_name: cohortNameById[event.cohort_id],
          sessionData: event.attendance_session_id
            ? sessions[event.attendance_session_id]
            : null,
          attendanceRecords,
        });
      }
    },
    [events, cohortNameById, sessions, attendanceBySession]
  );

  const handleDeleteEvent = () => {
    // Remove deleted event from state to update UI immediately
    setEvents((prevEvents) => prevEvents.filter((e) => e.id !== selectedEvent.id));
  };

  const handleCreateEvent = async (formData: FormData) => {
    const result = await createEvent(undefined, formData);
    if (result?.event) {
      setEvents((prevEvents) => [...prevEvents, result.event]);
    }
    if (result?.session) {
      setSessions((prev) => ({ ...prev, [result.session.id]: result.session }));
    }
    setCreateDate(null);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 pb-20">
      <div>
        <h1 className="text-xl font-bold text-foreground">Events</h1>
      </div>

      <WeekCalendarWithList
        events={events}
        onEventClick={handleEventClick}
        onCreateEvent={(date) => setCreateDate(date)}
      />

      <EventDetailModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        sessionData={selectedEvent?.sessionData}
        attendanceRecords={selectedEvent?.attendanceRecords}
        onClose={() => setSelectedEvent(null)}
        onDelete={handleDeleteEvent}
        onRefresh={() => {
          setSelectedEvent(null);
        }}
      />

      <EventCreateModal
        isOpen={!!createDate}
        selectedDate={createDate || undefined}
        cohorts={cohorts}
        students={students}
        onClose={() => setCreateDate(null)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
}
