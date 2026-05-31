import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Confirm the resident exists (and grab the name for the activity log).
  const { data: resident, error: fetchError } = await supabase
    .from('residents')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  // Gather Cloudinary assets across all of this resident's requests so they
  // can be removed before the DB cascade wipes the rows.
  const { data: requests } = await supabase
    .from('document_requests')
    .select('id')
    .eq('resident_id', id);
  const requestIds = (requests ?? []).map((r) => r.id);

  if (requestIds.length > 0) {
    const { data: docs } = await supabase
      .from('uploaded_documents')
      .select('cloudinary_public_id')
      .in('request_id', requestIds);
    await Promise.all(
      (docs ?? []).map((d) =>
        deleteFromCloudinary(d.cloudinary_public_id).catch((e) =>
          console.error('[delete] Cloudinary cleanup failed for', d.cloudinary_public_id, e)
        )
      )
    );
  }

  // Deleting the resident cascades to their document_requests and uploaded_documents.
  const { data: deleted, error } = await supabase
    .from('residents')
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
    action: `Deleted resident ${resident.first_name} ${resident.last_name}`,
    entity_type: 'resident',
    entity_id: id,
  });

  return NextResponse.json({ success: true });
}
