"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  event_at: string | null;
  attendance_session_id: string | null;
}

export function WeekCalendar({ events }: { events: Event[] }) {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    today.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return today;
  });

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
      const date = new Date(event.event_at).toLocaleDateString();
      if (!map[date]) map[date] = [];
      map[date].push(event);
    });
    return map;
  }, [events]);

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    today.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    setWeekStart(today);
  };

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

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} -{" "}
            {weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </h2>
          <p className="text-xs text-muted mt-1">
            {weekStart.toLocaleDateString("en-US", { year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={prevWeek} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={goToToday} className="h-8 px-2 text-xs">
            Today
          </Button>
          <Button onClick={nextWeek} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2 px-4">
        {days.map((date) => {
          const dateStr = date.toLocaleDateString();
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === new Date().toLocaleDateString();

          return (
            <div
              key={dateStr}
              className={`flex flex-col gap-2 p-2 rounded-lg min-h-32 ${
                isToday ? "bg-primary/10 ring-1 ring-primary" : "bg-surface"
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {date.getDate()}
                </p>
              </div>

              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <div className="text-xs bg-primary/20 text-primary p-1 rounded cursor-pointer hover:bg-primary/30 transition-colors">
                        <p className="font-medium line-clamp-1">{event.title}</p>
                        {event.event_at && (
                          <p className="text-xs opacity-80">
                            {new Date(event.event_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted">-</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
