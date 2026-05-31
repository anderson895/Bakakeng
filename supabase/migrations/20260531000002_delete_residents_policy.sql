-- ============================================================
-- Add DELETE policy for residents
-- ============================================================
-- RLS is enabled on `residents` but no DELETE policy existed, so admin
-- "Delete Resident" would silently remove 0 rows. Deleting a resident
-- cascades to their document_requests and uploaded_documents via the
-- existing ON DELETE CASCADE foreign keys (cascade actions bypass RLS).
-- ============================================================

CREATE POLICY "Authenticated can delete residents"
  ON residents FOR DELETE TO authenticated USING (true);
