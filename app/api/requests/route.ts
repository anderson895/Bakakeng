import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('document_requests')
    .select(`
      *,
      residents (
        id, first_name, last_name, middle_name,
        address, contact_number, email, purok
      ),
      uploaded_documents (*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Search only by control_number at the request level
  // (cannot filter joined table columns with .or() in Supabase)
  if (search) {
    query = query.ilike('control_number', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If search didn't match by control number, try searching by resident name
  if (search && (!data || data.length === 0)) {
    const nameSearch = search.trim();
    const parts = nameSearch.split(' ');

    const nameQuery = supabase
      .from('residents')
      .select('id')
      .or(`first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[0]}%`);

    const { data: residentMatches } = await nameQuery;

    if (residentMatches && residentMatches.length > 0) {
      const residentIds = residentMatches.map(r => r.id);

      let nameReqQuery = supabase
        .from('document_requests')
        .select(`
          *,
          residents (
            id, first_name, last_name, middle_name,
            address, contact_number, email, purok
          ),
          uploaded_documents (*)
        `, { count: 'exact' })
        .in('resident_id', residentIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== 'all') {
        nameReqQuery = nameReqQuery.eq('status', status);
      }

      const { data: nameData, error: nameError, count: nameCount } = await nameReqQuery;

      if (nameError) {
        return NextResponse.json({ error: nameError.message }, { status: 500 });
      }

      return NextResponse.json({ data: nameData, count: nameCount, page, limit });
    }
  }

  return NextResponse.json({ data, count, page, limit });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      first_name, last_name, middle_name, date_of_birth,
      address, purok, contact_number, email,
      document_type, purpose,
    } = body;

    // Email is the resident identity key — required so submissions can be deduped.
    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Reuse an existing resident (matched on email) instead of
    // creating a duplicate every time the same person submits a request.
    const { data: residentId, error: residentError } = await supabase.rpc('get_or_create_resident', {
      p_first_name: first_name,
      p_last_name: last_name,
      p_middle_name: middle_name ?? null,
      p_date_of_birth: date_of_birth || null,
      p_address: address,
      p_purok: purok ?? null,
      p_contact_number: contact_number,
      p_email: email ?? null,
    });

    if (residentError || !residentId) {
      return NextResponse.json(
        { error: residentError?.message || 'Failed to resolve resident' },
        { status: 500 }
      );
    }

    // Create document request
    const { data: docRequest, error: reqError } = await supabase
      .from('document_requests')
      .insert({
        resident_id: residentId,
        document_type,
        purpose: purpose.trim(),
        status: 'pending',
        control_number: '',
      })
      .select(`*, residents(*)`)
      .single();

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    return NextResponse.json({ data: docRequest }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}