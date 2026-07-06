-- Lets students read notification history relevant to them, without
-- opening up the admin-only notifications/notification_targets tables
-- generally. A student can only ever see: sent notifications addressed to
-- "everyone", or sent notifications where they personally appear as a
-- target — never drafts, scheduled-but-unsent, or other students' targets.

create policy "notification_targets_select_own"
  on public.notification_targets for select
  using (student_id = auth.uid());

create policy "notifications_select_for_recipients"
  on public.notifications for select
  using (
    status = 'sent'
    and (
      audience = 'all'
      or exists (
        select 1 from public.notification_targets nt
        where nt.notification_id = notifications.id and nt.student_id = auth.uid()
      )
    )
  );
