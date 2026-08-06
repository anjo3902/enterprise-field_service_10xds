-- =============================================================================
-- Migration: 20260716037_ticket_attachments.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_attachments` table.
--            Records every file attached to a ticket — photos, audio, video, PDF.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  ticket_id                UUID          NOT NULL
                             REFERENCES public.tickets (id)
                             ON DELETE CASCADE,

  -- ── File Metadata ─────────────────────────────────────────────────────────
  storage_path             TEXT          NOT NULL,               -- Supabase Storage bucket path
  file_name                TEXT          NOT NULL,
  mime_type                TEXT          NOT NULL,               -- e.g. "image/jpeg", "application/pdf"
  file_size_bytes          BIGINT,
  
  -- e.g. "evidence_photo", "audio_note", "video", "pdf_report", "document"
  attachment_type          TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  uploaded_by              UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id
  ON public.ticket_attachments (ticket_id);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.ticket_attachments IS 'Files attached to a ticket — evidence photos, audio notes, PDF reports.';
