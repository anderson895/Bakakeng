'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Loader2, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Resident } from '@/types';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ResidentWithCount = Resident & { request_count: number };

export default function ResidentsPage() {
  const [residents, setResidents] = useState<ResidentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<ResidentWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from('residents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,contact_number.ilike.%${search}%`);
    }

    const { data } = await query;
    if (data) {
      // Fetch request counts
      const supabase2 = createClient();
      const withCounts = await Promise.all(data.map(async (r) => {
        const { count } = await supabase2.from('document_requests').select('id', { count: 'exact', head: true }).eq('resident_id', r.id);
        return { ...r, request_count: count || 0 };
      }));
      setResidents(withCounts);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchResidents, 300);
    return () => clearTimeout(timer);
  }, [fetchResidents]);

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/residents/${target.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ title: 'Resident deleted', description: `${target.first_name} ${target.last_name} has been removed.` });
      setTarget(null);
      fetchResidents();
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err instanceof Error ? err.message : 'Try again' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 animate-fade-up stagger-1">
        <h1 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--navy)' }}>Residents</h1>
        <p className="text-slate-500 text-sm mt-1">{residents.length} registered residents</p>
      </div>

      <div className="relative mb-6 animate-fade-up stagger-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name or contact number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : residents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No residents found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up stagger-3">
          {residents.map((resident) => (
            <div key={resident.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                  style={{ background: 'var(--navy)' }}>
                  {resident.first_name[0]}{resident.last_name[0]}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {resident.request_count} request{resident.request_count !== 1 ? 's' : ''}
                  </Badge>
                  <button
                    onClick={() => setTarget(resident)}
                    title="Delete resident"
                    className="text-slate-300 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">
                {resident.first_name} {resident.middle_name ? `${resident.middle_name[0]}. ` : ''}{resident.last_name}
              </h3>
              {resident.date_of_birth && (
                <p className="text-xs text-slate-400 mb-2">Born {formatDate(resident.date_of_birth)}</p>
              )}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{resident.address}{resident.purok ? ` — ${resident.purok}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>{resident.contact_number}</span>
                </div>
                {resident.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{resident.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!target} onOpenChange={(open) => !deleting && !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Resident
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{target?.first_name} {target?.last_name}</strong>
              {target && target.request_count > 0 && (
                <> along with their <strong>{target.request_count} document request{target.request_count !== 1 ? 's' : ''}</strong> and all uploaded files</>
              )}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
