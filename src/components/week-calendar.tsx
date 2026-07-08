"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  event_at: string | null;
}

interface WeekCalendarProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export function WeekCalendar({ events, onEventClick }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    today.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return today;
  });

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    days.push(date);
  }

  const eventsByDate: Record<string, Event[]> = {};
  events.forEach((event) => {
    if (!event.event_at) return;
    const dateKey = new Date(event.event_at).toLocaleDateString();
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(event);
  });

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
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toLocaleDateString() === today.toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
          {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          const dateKey = date.toLocaleDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const today = isToday(date);

          return (
            <div
              key={idx}
              className={`flex flex-col rounded-lg border p-3 min-h-[160px] ${
                today ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
              }`}
            >
              <div className="mb-2">
                <p className={`text-xs font-semibold ${today ? "text-blue-600" : "text-gray-600"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-lg font-bold ${today ? "text-blue-600" : "text-foreground"}`}>
                  {date.getDate()}
                </p>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event.id)}
                      className="text-left text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition line-clamp-2 font-medium"
                    >
                      {event.title}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 text-center mt-auto mb-auto">No events</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
