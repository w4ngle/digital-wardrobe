CREATE TABLE IF NOT EXISTS telegram_user_state (
  telegram_user_id BIGINT PRIMARY KEY,
  welcome_shown_at TIMESTAMPTZ
);

ALTER TABLE telegram_user_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE telegram_user_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE telegram_user_state TO service_role;

NOTIFY pgrst, 'reload schema';
