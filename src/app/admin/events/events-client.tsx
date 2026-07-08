"use client";

import { useState, useCallback } from "react";
import { AdminCalendar } from "@/components/admin-calendar";
import { EventDetailModal } from "@/components/event-detail-modal";
import { EventCreateModal } from "@/components/event-create-modal";
import { createEvent } from "@/lib/events/actions";

interface AdminEventsClientProps {
  initialEvents: any[];
  cohorts: any[];
  sessionDataById: Record<string, any>;
  cohortNameById: Record<string, string>;
}

export function AdminEventsClient({
  initialEvents,
  cohorts,
  sessionDataById,
  cohortNameById,
}: AdminEventsClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [events, setEvents] = useState(initialEvents);

  const handleEventClick = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEvent({
          ...event,
          cohort_name: cohortNameById[event.cohort_id],
          sessionData: event.attendance_session_id
            ? sessionDataById[event.attendance_session_id]
            : null,
        });
      }
    },
    [events, cohortNameById, sessionDataById]
  );

  const handleDateClick = (date: Date) => {
    setCreateDate(date);
  };

  const handleCreateEvent = async (formData: FormData) => {
    await createEvent(undefined, formData);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Events Calendar</h1>
        <p className="mt-2 text-sm text-gray-600">Click a date to create an event. Click an event to manage it.</p>
      </div>

      <AdminCalendar
        events={events}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
      />

      <EventDetailModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        sessionData={selectedEvent?.sessionData}
        onClose={() => setSelectedEvent(null)}
        onRefresh={() => {
          setSelectedEvent(null);
        }}
      />

      <EventCreateModal
        isOpen={!!createDate}
        selectedDate={createDate || undefined}
        cohorts={cohorts}
        onClose={() => setCreateDate(null)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
}
