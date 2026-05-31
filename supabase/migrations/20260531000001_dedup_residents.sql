-- ============================================================
-- Deduplicate residents on document request submission (by EMAIL)
-- ============================================================
-- Previously /api/requests inserted a NEW resident row on every
-- submission, so a single person who requested multiple documents
-- showed up as multiple residents.
--
-- Identity key: EMAIL (one person = one unique email). Email is now a
-- required field on the public request form.
--
-- The public form is submitted by the `anon` role, which by RLS can
-- only INSERT residents (not SELECT/UPDATE). This SECURITY DEFINER
-- function runs with the owner's rights so it can look up an existing
-- resident by email and reuse it, returning the resident id either way.
-- ============================================================

CREATE OR REPLACE FUNCTION get_or_create_resident(
  p_first_name     TEXT,
  p_last_name      TEXT,
  p_middle_name    TEXT,
  p_date_of_birth  DATE,
  p_address        TEXT,
  p_purok          TEXT,
  p_contact_number TEXT,
  p_email          TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_email TEXT := NULLIF(trim(COALESCE(p_email, '')), '');
BEGIN
  -- Match an existing resident by email (case-insensitive).
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_id
    FROM residents
    WHERE lower(email) = lower(v_email)
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    -- New resident
    INSERT INTO residents (
      first_name, last_name, middle_name, date_of_birth,
      address, purok, contact_number, email
    ) VALUES (
      trim(p_first_name),
      trim(p_last_name),
      NULLIF(trim(COALESCE(p_middle_name, '')), ''),
      p_date_of_birth,
      trim(p_address),
      NULLIF(trim(COALESCE(p_purok, '')), ''),
      trim(p_contact_number),
      v_email
    )
    RETURNING id INTO v_id;
  ELSE
    -- Returning resident (same email) — refresh the rest of the details
    -- with the latest submission. Keep email as the stable match key.
    UPDATE residents SET
      first_name     = trim(p_first_name),
      last_name      = trim(p_last_name),
      middle_name    = NULLIF(trim(COALESCE(p_middle_name, '')), ''),
      date_of_birth  = COALESCE(p_date_of_birth, date_of_birth),
      address        = trim(p_address),
      purok          = NULLIF(trim(COALESCE(p_purok, '')), ''),
      contact_number = trim(p_contact_number)
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_resident(
  TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
