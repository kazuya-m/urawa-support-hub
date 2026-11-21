ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_status_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled'));

ALTER TABLE public.notifications
  ADD COLUMN claimed_at TIMESTAMPTZ,
  ADD COLUMN message JSONB;

DELETE FROM public.notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY ticket_id, notification_type, notification_time
        ORDER BY
          CASE status
            WHEN 'sent' THEN 0
            WHEN 'scheduled' THEN 1
            WHEN 'failed' THEN 2
            ELSE 3
          END,
          created_at DESC,
          id
      ) AS rank
    FROM public.notifications
  ) ranked
  WHERE ranked.rank > 1
);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_ticket_type_time_key
  UNIQUE (ticket_id, notification_type, notification_time);

CREATE OR REPLACE FUNCTION public.claim_notification(
  p_ticket_id TEXT,
  p_notification_type TEXT,
  p_notification_time TIMESTAMPTZ,
  p_message JSONB
)
RETURNS TABLE (id UUID, message JSONB, claimed_at TIMESTAMPTZ)
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.notifications AS n
    (ticket_id, notification_type, notification_time, status, claimed_at, message)
  VALUES
    (p_ticket_id, p_notification_type, p_notification_time, 'sending', now(), p_message)
  ON CONFLICT (ticket_id, notification_type, notification_time) DO UPDATE
    SET status = 'sending',
        claimed_at = now(),
        updated_at = now(),
        error_message = NULL,
        message = COALESCE(n.message, EXCLUDED.message)
    WHERE n.status IN ('scheduled', 'failed', 'cancelled')
       OR (n.status = 'sending' AND n.claimed_at < now() - INTERVAL '6 minutes')
  RETURNING n.id, n.message, n.claimed_at;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_notification(TEXT, TEXT, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification(TEXT, TEXT, TIMESTAMPTZ, JSONB)
  TO service_role;
