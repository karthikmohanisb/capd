"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  title: string;
  event_at: string | null;
  location: string | null;
  attendance_session_id: string | null;
};

interface StudentCalendarProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export function StudentCalendar({ events, onEventClick }: StudentCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    today.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return today;
  });

  const [selectedDateKey, setSelectedDateKey] = useState(new Date().toLocaleDateString());

  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      result.push(date);
    }
    return result;
  }, [weekStart]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((event) => {
      if (!event.event_at) return;
      const dateKey = new Date(event.event_at).toLocaleDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        if (!a.event_at || !b.event_at) return 0;
        return new Date(a.event_at).getTime() - new Date(b.event_at).getTime();
      });
    });
    return map;
  }, [events]);

  const selectedDayEvents = eventsByDate[selectedDateKey] || [];

  const prevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    today.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    setWeekStart(today);
    setSelectedDateKey(today.toLocaleDateString());
  };

  const isToday = (date: Date) => date.toLocaleDateString() === new Date().toLocaleDateString();
  const isSelected = (date: Date) => date.toLocaleDateString() === selectedDateKey;

  const selectedDateObj = new Date(selectedDateKey);
  const dayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = selectedDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-600">
          {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
          {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-2 py-2" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" className="px-3 py-2 text-xs" onClick={goToToday}>
            Today
          </Button>
          <Button variant="secondary" className="px-2 py-2" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const dateKey = date.toLocaleDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const today = isToday(date);
          const selected = isSelected(date);

          return (
            <button
              key={idx}
              onClick={() => setSelectedDateKey(dateKey)}
              className={`flex flex-col items-center py-2 rounded text-xs transition ${
                selected
                  ? "bg-blue-600 text-white font-semibold"
                  : today
                    ? "bg-blue-100 text-blue-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="font-medium">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="text-lg font-bold">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className="text-xs mt-1 bg-white text-gray-800 px-1.5 rounded-full">
                  {dayEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Header */}
      <div className="border-t pt-4">
        <h3 className="text-base font-semibold text-foreground">
          {dayName}, {monthDay}
        </h3>
        <p className="text-xs text-gray-500">
          {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-2">
        {selectedDayEvents.length > 0 ? (
          selectedDayEvents.map((event) => {
            const eventTime = event.event_at
              ? new Date(event.event_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";

            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event.id)}
                className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition"
              >
                <p className="font-medium text-foreground text-sm">{event.title}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-600">
                  {eventTime && <span>⏰ {eventTime}</span>}
                  {event.location && <span>📍 {event.location}</span>}
                  {event.attendance_session_id && <span className="text-green-600 font-medium">✓ Attendance</span>}
                </div>
              </button>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">No events this day</p>
        )}
      </div>
    </div>
  );
}
