"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_at: string | null;
  location?: string;
  category?: string;
  status: string;
}

interface AdminCalendarProps {
  events: Event[];
  onDateClick: (date: Date) => void;
  onEventClick: (eventId: string) => void;
}

export function AdminCalendar({ events, onDateClick, onEventClick }: AdminCalendarProps) {
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.event_at) return 1;
    if (!b.event_at) return -1;
    return new Date(a.event_at).getTime() - new Date(b.event_at).getTime();
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Create Button */}
      <Button
        onClick={() => onDateClick(new Date())}
        className="w-full flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        Create New Event
      </Button>

      {/* Events List */}
      <div className="flex flex-col gap-3">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event.id)}
              className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                    {event.event_at && (
                      <span>📅 {new Date(event.event_at).toLocaleDateString()}</span>
                    )}
                    {event.location && <span>📍 {event.location}</span>}
                    {event.category && <span>🏷️ {event.category}</span>}
                  </div>
                </div>
                <div className="text-xs font-medium whitespace-nowrap">
                  {event.status === "published" && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Published</span>
                  )}
                  {event.status === "draft" && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Draft</span>
                  )}
                  {event.status === "cancelled" && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">Cancelled</span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-gray-600">
            <p>No events yet</p>
            <p className="text-sm mt-1">Click "Create New Event" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
