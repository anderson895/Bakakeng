import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendRejectionEmail, sendReadyEmail } from '@/lib/email';
import { deleteFromCloudinary } from '@/lib/cloudinary';
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch the request + its uploaded docs so the Cloudinary assets can be cleaned up.
  const { data: existing, error: fetchError } = await supabase
    .from('document_requests')
    .select('control_number, uploaded_documents(cloudinary_public_id)')
    .eq('id', id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  // Best-effort Cloudinary cleanup — don't block the deletion if it fails.
  const docs = (existing.uploaded_documents ?? []) as { cloudinary_public_id: string }[];
  await Promise.all(
    docs.map((d) =>
      deleteFromCloudinary(d.cloudinary_public_id).catch((e) =>
        console.error('[delete] Cloudinary cleanup failed for', d.cloudinary_public_id, e)
      )
    )
  );

  // Remove dependent rows first in case the FK isn't set to cascade.
  await supabase.from('uploaded_documents').delete().eq('request_id', id);

  const { data: deleted, error } = await supabase
    .from('document_requests')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // RLS with no DELETE policy removes 0 rows without raising an error.
  if (!deleted || deleted.length === 0) {
    return NextResponse.json(
      { error: 'Delete blocked by database policy (no rows removed). Run the DELETE RLS migration in Supabase.' },
      { status: 403 }
    );
  }

  await supabase.from('activity_logs').insert({
    admin_id: user.id,
    action: `Deleted request ${existing.control_number}`,
    entity_type: 'document_request',
    entity_id: id,
  });

  return NextResponse.json({ success: true });
}
