"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  event_at: string | null;
}

interface AdminCalendarProps {
  events: Event[];
  onDateClick: (date: Date) => void;
  onEventClick: (eventId: string) => void;
}

export function AdminCalendar({ events, onDateClick, onEventClick }: AdminCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay());

  const days = [];
  const current = new Date(startDate);
  while (current <= monthEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const eventsByDate: Record<string, Event[]> = {};
  events.forEach((event) => {
    if (!event.event_at) return;
    const dateKey = new Date(event.event_at).toLocaleDateString();
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(event);
  });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toLocaleDateString() === today.toLocaleDateString();
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-2 py-2" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="secondary" className="px-2 py-2" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-semibold text-xs text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 auto-rows-[120px]">
        {days.map((date, idx) => {
          const dateKey = date.toLocaleDateString();
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrent = isCurrentMonth(date);
          const isCurrentDay = isToday(date);

          return (
            <div
              key={idx}
              className={`border rounded-lg p-2 flex flex-col ${
                isCurrentDay
                  ? "bg-blue-50 border-blue-300"
                  : isCurrent
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isCurrent ? "text-foreground" : "text-gray-400"}`}>
                  {date.getDate()}
                </span>
                <button
                  onClick={() => onDateClick(date)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Events */}
              <div className="flex-1 overflow-y-auto space-y-1 text-xs">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event.id)}
                    className="w-full text-left bg-blue-100 text-blue-700 px-2 py-1 rounded truncate hover:bg-blue-200 transition"
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-xs text-gray-500 px-2">+{dayEvents.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
