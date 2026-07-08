-- Performance optimization indexes for CAPD

-- Published events queries (most common)
create index if not exists published_events_event_at_idx
  on published_events (event_at);
create index if not exists published_events_status_idx
  on published_events (status);

-- Attendance records queries
create index if not exists attendance_records_session_student_idx
  on attendance_records (session_id, student_id);
create index if not exists attendance_records_session_idx
  on attendance_records (session_id);

-- Notifications
create index if not exists notifications_created_at_idx
  on notifications (created_at desc);
create index if not exists notifications_status_idx
  on notifications (status);

-- Notification reads
create index if not exists notification_reads_profile_idx
  on notification_reads (profile_id);

-- Event audience filtering
create index if not exists event_audiences_event_idx
  on event_audiences (event_id);

-- Profiles for cohort queries
create index if not exists profiles_cohort_idx
  on profiles (cohort_id);
create index if not exists profiles_role_status_idx
  on profiles (role, status);
