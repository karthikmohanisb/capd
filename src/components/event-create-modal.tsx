"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudiencePicker } from "@/components/audience-picker";

interface Cohort {
  id: string;
  name: string;
}

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  cohort_id?: string | null;
}

interface EventCreateModalProps {
  isOpen: boolean;
  selectedDate?: Date;
  cohorts: Cohort[];
  students: Student[];
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<any>;
}

export function EventCreateModal({ isOpen, selectedDate, cohorts, students, onClose, onSubmit }: EventCreateModalProps) {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(formData);
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Create Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Guest Speaker: Jane Doe"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              name="description"
              placeholder="Details students should know"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date & Time</label>
              <input
                type="datetime-local"
                name="event_at"
                defaultValue={
                  selectedDate
                    ? selectedDate.toISOString().slice(0, 16)
                    : new Date().toISOString().slice(0, 16)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Location</label>
              <input
                type="text"
                name="location"
                placeholder="e.g. Auditorium"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <input
              type="text"
              name="category"
              placeholder="e.g. Professional Club"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-3">
            <input type="checkbox" name="notify_students" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Notify students when this event is created</span>
          </label>

          <AudiencePicker cohorts={cohorts} students={students} />

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={pending} className="px-3 py-2 text-xs">
              Cancel
            </Button>
            <Button type="submit" loading={pending} className="px-3 py-2 text-xs">
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
