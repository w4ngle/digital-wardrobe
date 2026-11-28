CREATE OR REPLACE FUNCTION mark_items_worn(p_item_ids UUID[])
RETURNS SETOF items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO wear_history (item_id, worn_at)
  SELECT id, v_now FROM items WHERE id = ANY(p_item_ids);

  UPDATE items
  SET wear_count = COALESCE(wear_count, 0) + 1,
      wears_since_wash = COALESCE(wears_since_wash, 0) + 1,
      last_worn_at = v_now
  WHERE id = ANY(p_item_ids);

  RETURN QUERY SELECT * FROM items WHERE id = ANY(p_item_ids);
END;
$$;

CREATE OR REPLACE FUNCTION unmark_items_worn(p_item_ids UUID[], p_since TIMESTAMPTZ)
RETURNS SETOF items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_ids UUID[];
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON (item_id) id, item_id
    FROM wear_history
    WHERE item_id = ANY(p_item_ids) AND worn_at >= p_since
    ORDER BY item_id, worn_at DESC
  ), deleted AS (
    DELETE FROM wear_history WHERE id IN (SELECT id FROM latest)
    RETURNING item_id
  )
  SELECT COALESCE(ARRAY_AGG(item_id), ARRAY[]::UUID[]) INTO v_deleted_ids FROM deleted;

  UPDATE items item
  SET wear_count = GREATEST(0, COALESCE(item.wear_count, 0) - 1),
      wears_since_wash = GREATEST(0, COALESCE(item.wears_since_wash, 0) - 1),
      last_worn_at = (SELECT MAX(history.worn_at) FROM wear_history history WHERE history.item_id = item.id)
  WHERE item.id = ANY(v_deleted_ids);

  RETURN QUERY SELECT * FROM items WHERE id = ANY(p_item_ids);
END;
$$;

REVOKE ALL ON FUNCTION mark_items_worn(UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION unmark_items_worn(UUID[], TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_items_worn(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION unmark_items_worn(UUID[], TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION set_items_laundry(
  p_item_ids UUID[],
  p_since TIMESTAMPTZ,
  p_laundry BOOLEAN,
  p_return_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_laundry THEN
    UPDATE items
    SET availability = 'laundry', laundry_return_at = p_return_at
    WHERE id = ANY(p_item_ids);
  END IF;

  UPDATE wear_history
  SET laundry_decision = CASE WHEN p_laundry THEN 'laundry' ELSE 'keep' END
  WHERE item_id = ANY(p_item_ids) AND worn_at >= p_since;
END;
$$;

REVOKE ALL ON FUNCTION set_items_laundry(UUID[], TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_items_laundry(UUID[], TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) TO service_role;

NOTIFY pgrst, 'reload schema';
