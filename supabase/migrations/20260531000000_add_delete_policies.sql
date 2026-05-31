-- ============================================================
-- Add DELETE policies for document requests + uploaded documents
-- ============================================================
-- RLS is enabled on these tables but the initial migration only
-- defined INSERT / SELECT / UPDATE policies. Without a DELETE policy,
-- Postgres silently removes 0 rows (no error), so the admin "Remove
-- Document Request" action appeared to succeed but deleted nothing.
-- ============================================================

CREATE POLICY "Authenticated can delete document requests"
  ON document_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete uploaded documents"
  ON uploaded_documents FOR DELETE TO authenticated USING (true);
