import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRejectionEmail, sendReadyEmail } from '@/lib/email';
import type { DocumentRequest } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('document_requests')
    .select(`*, residents(*), uploaded_documents(*)`)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { status, notes, rejection_reason, priority } = body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason;
  if (priority !== undefined) updates.priority = priority;

  if (status === 'processing') {
    updates.processed_by = user.id;
    updates.processed_at = new Date().toISOString();
  }
  if (status === 'released') {
    updates.released_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('document_requests')
    .update(updates)
    .eq('id', id)
    .select(`*, residents(*), uploaded_documents(*)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the resident by email on key status changes (best-effort, non-blocking).
  const req = data as DocumentRequest;
  const residentEmail = req.residents?.email;
  if (residentEmail) {
    const name = `${req.residents?.first_name ?? ''} ${req.residents?.last_name ?? ''}`.trim() || 'Resident';
    const common = {
      to: residentEmail,
      name,
      controlNumber: req.control_number,
      documentType: req.document_type,
    };
    if (status === 'rejected') {
      await sendRejectionEmail({ ...common, reason: req.rejection_reason || 'Incomplete requirements.' });
    } else if (status === 'ready') {
      await sendReadyEmail(common);
    }
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    admin_id: user.id,
    action: `Updated request to ${status || 'modified'}`,
    entity_type: 'document_request',
    entity_id: id,
    details: updates,
  });

  return NextResponse.json({ data });
}
