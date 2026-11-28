-- Technical AI usage data is server-only, just like the wardrobe itself.
DROP POLICY IF EXISTS "Разрешить всё для ai_usage" ON ai_usage;
REVOKE ALL ON TABLE ai_usage FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_ai_usage(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_ai_usage(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
