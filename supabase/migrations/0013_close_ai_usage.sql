-- Technical AI usage data is server-only, just like the wardrobe itself.
DROP POLICY IF EXISTS "Разрешить всё для ai_usage" ON ai_usage;
REVOKE ALL ON TABLE ai_usage FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_daily_ai_usage(TEXT) FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
