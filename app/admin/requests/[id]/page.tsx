'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Loader2,
  Upload, FileText, Download, AlertCircle, ChevronDown, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { DocumentRequest, DOCUMENT_TYPE_LABELS, STATUS_CONFIG, RequestStatus } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const STATUS_TRANSITIONS: Record<RequestStatus, { label: string; next: RequestStatus; color: string }[]> = {
  pending: [{ label: 'Start Processing', next: 'processing', color: 'text-blue-700' }, { label: 'Reject Request', next: 'rejected', color: 'text-red-700' }],
  processing: [{ label: 'Mark as Ready', next: 'ready', color: 'text-emerald-700' }, { label: 'Reject Request', next: 'rejected', color: 'text-red-700' }],
  ready: [{ label: 'Mark as Released', next: 'released', color: 'text-slate-700' }],
  released: [],
  rejected: [{ label: 'Reopen Request', next: 'pending', color: 'text-blue-700' }],
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      const json = await res.json();
      if (res.ok) {
        setRequest(json.data);
        setNotes(json.data.notes || '');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const updateStatus = async (newStatus: RequestStatus, reason?: string) => {
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (notes) body.notes = notes;
      if (reason) body.rejection_reason = reason;

      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRequest(json.data);
      setShowRejectForm(false);
      setShowActions(false);
      toast({ title: 'Status updated', description: `Request marked as ${STATUS_CONFIG[newStatus].label}` });
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Update failed', description: err instanceof Error ? err.message : 'Try again' });
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Notes saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save notes' });
    } finally {
      setUpdating(false);
    }
  };

  const deleteRequest = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ title: 'Request deleted', description: `${request?.control_number} has been removed.` });
      router.push('/admin/requests');
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err instanceof Error ? err.message : 'Try again' });
      setDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('requestId', id);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchRequest();
      toast({ title: 'File uploaded successfully' });
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err instanceof Error ? err.message : 'Try again' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">Request not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const sc = STATUS_CONFIG[request.status];
  const transitions = STATUS_TRANSITIONS[request.status];
  const statusVariantMap: Record<RequestStatus, 'pending' | 'processing' | 'ready' | 'released' | 'rejected'> = {
    pending: 'pending', processing: 'processing', ready: 'ready', released: 'released', rejected: 'rejected',
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl" style={{ color: 'var(--navy)' }}>
                {request.control_number}
              </h1>
              <Badge variant={statusVariantMap[request.status]}>
                <span className={`status-dot ${request.status} mr-1.5`}></span>
                {sc.label}
              </Badge>
              {request.priority && (
                <Badge variant="secondary" className="text-xs">⚡ Priority</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Submitted {formatDateTime(request.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {transitions.length > 0 && (
            <div className="relative">
              <Button onClick={() => setShowActions(!showActions)} disabled={updating}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Status'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {transitions.map(({ label, next, color }) => (
                    <button key={next}
                      onClick={() => {
                        if (next === 'rejected') {
                          setShowRejectForm(true);
                          setShowActions(false);
                        } else {
                          updateStatus(next);
                        }
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${color}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            title="Delete request"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 animate-fade-in">
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Reject Request
          </h3>
          <Textarea
            placeholder="State the reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mb-3 bg-white"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => updateStatus('rejected', rejectionReason)} disabled={!rejectionReason || updating}>
              Confirm Rejection
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !deleting && setShowDeleteDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Request
            </DialogTitle>
            <DialogDescription>
              This will permanently delete request <strong>{request.control_number}</strong> and all of its
              uploaded documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteRequest} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left - Resident & Document Info */}
        <div className="md:col-span-2 space-y-5">
          {/* Resident Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Resident Information</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {[
                { label: 'Full Name', value: `${request.residents?.first_name} ${request.residents?.middle_name ? request.residents.middle_name + ' ' : ''}${request.residents?.last_name}` },
                { label: 'Date of Birth', value: request.residents?.date_of_birth ? formatDate(request.residents.date_of_birth) : '—' },
                { label: 'Address', value: request.residents?.address || '—' },
                { label: 'Purok', value: request.residents?.purok || '—' },
                { label: 'Contact No.', value: request.residents?.contact_number || '—' },
                { label: 'Email', value: request.residents?.email || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="font-medium text-slate-800 break-words">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Document Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Document Details</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Document Type</p>
                <p className="font-medium text-slate-800">{DOCUMENT_TYPE_LABELS[request.document_type]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Status</p>
                <Badge variant={statusVariantMap[request.status]}>{sc.label}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Purpose</p>
                <p className="font-medium text-slate-800">{request.purpose}</p>
              </div>
              {request.processed_at && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Processed At</p>
                  <p className="font-medium text-slate-800">{formatDateTime(request.processed_at)}</p>
                </div>
              )}
              {request.released_at && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Released At</p>
                  <p className="font-medium text-slate-800">{formatDateTime(request.released_at)}</p>
                </div>
              )}
              {request.rejection_reason && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Rejection Reason</p>
                  <p className="font-medium text-red-600">{request.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Uploaded Documents</h2>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </div>
            {!request.uploaded_documents?.length ? (
              <div className="text-center py-6 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs mt-1">Upload processed documents here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {request.uploaded_documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(15,45,94,0.08)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--navy)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('en-PH')}</p>
                    </div>
                    <a href={doc.cloudinary_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Notes & Timeline */}
        <div className="space-y-5">
          {/* Admin Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Admin Notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this request..."
              rows={4}
              className="mb-3"
            />
            <Button size="sm" onClick={saveNotes} disabled={updating} className="w-full">
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Notes'}
            </Button>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Timeline</h2>
            <div className="space-y-3">
              {[
                { label: 'Submitted', date: request.created_at, icon: Clock, active: true },
                { label: 'Processing Started', date: request.processed_at, icon: Loader2, active: !!request.processed_at },
                { label: 'Ready for Release', date: request.status === 'ready' || request.released_at ? request.updated_at : null, icon: CheckCircle, active: request.status === 'ready' || request.status === 'released' },
                { label: 'Document Released', date: request.released_at, icon: CheckCircle, active: !!request.released_at },
              ].map(({ label, date, icon: Icon, active }, i) => (
                <div key={i} className={`flex items-start gap-3 ${!active ? 'opacity-30' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${active ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} style={{ width: '14px', height: '14px' }} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</p>
                    {date && <p className="text-xs text-slate-400">{formatDateTime(date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
