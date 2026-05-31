'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText, CheckCircle2, Search, Clock, MapPin,
  Phone, ChevronRight, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_TYPE_LABELS, STATUS_CONFIG, DocumentType, DocumentRequest } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  middle_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().min(5, 'Complete address is required'),
  purok: z.string().optional(),
  contact_number: z.string().min(7, 'Valid contact number required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  document_type: z.string().min(1, 'Please select document type'),
  purpose: z.string().min(10, 'Please state the purpose (min 10 characters)'),
});

type FormData = z.infer<typeof schema>;

const PUROKS = ['Purok 1','Purok 2','Purok 3','Purok 4','Purok 5','Purok 6','Purok 7','Purok 8'];

type Step = 'home' | 'form' | 'success' | 'track';

export default function HomePage() {
  const [step, setStep] = useState<Step>('home');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DocumentRequest | null>(null);
  const [trackNumber, setTrackNumber] = useState('');
  const [trackResult, setTrackResult] = useState<DocumentRequest | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState('');
  const { toast } = useToast();

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setSubmitted(json.data);
      setStep('success');
      reset();
      setSelectedDocType('');
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackNumber.trim()) return;
    setTracking(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await fetch(`/api/requests?search=${encodeURIComponent(trackNumber.trim())}&limit=5`);
      const json = await res.json();
      const found = json.data?.find((r: DocumentRequest) => r.control_number === trackNumber.trim().toUpperCase());
      if (!found) setTrackError('No request found with that control number.');
      else setTrackResult(found);
    } catch {
      setTrackError('Unable to fetch request. Please try again.');
    } finally {
      setTracking(false);
    }
  };

  const statusConfig = trackResult ? STATUS_CONFIG[trackResult.status] : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setStep('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
              <Image src="/logo.png" alt="Barangay Bakakeng Logo" width={40} height={40} className="object-cover w-full h-full" />
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500 leading-none">Republic of the Philippines</p>
              <h1 className="text-sm font-semibold leading-tight" style={{ color: 'var(--navy)' }}>Barangay Bakakeng</h1>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('track')}>
              <Search className="w-4 h-4 mr-1" />Track Request
            </Button>
            <Button size="sm" onClick={() => setStep('form')}>Request Document</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* HOME */}
        {step === 'home' && (
          <div className="animate-fade-up">
            <div className="text-center mb-16 pt-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 border"
                style={{ background: 'rgba(244,169,0,0.08)', borderColor: 'rgba(244,169,0,0.3)', color: 'var(--navy)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Online Document Requests Now Available
              </div>
              <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: 'var(--navy)' }}>Barangay Bakakeng</h1>
              <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8">
                Request official barangay documents online. Fast, convenient, and paperless.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={() => setStep('form')} className="gap-2">
                  <FileText className="w-4 h-4" />Request a Document<ChevronRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setStep('track')} className="gap-2">
                  <Search className="w-4 h-4" />Track My Request
                </Button>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="font-display text-2xl text-center mb-8" style={{ color: 'var(--navy)' }}>Available Documents</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label], i) => (
                  <div key={i} onClick={() => {
                    setSelectedDocType(value);
                    setValue('document_type', value);
                    setStep('form');
                  }}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0F2D5E] hover:shadow-md transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'rgba(15,45,94,0.06)' }}>
                      <FileText className="w-5 h-5" style={{ color: 'var(--navy)' }} />
                    </div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-[#0F2D5E] leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Clock, title: 'Fast Processing', desc: '2–5 minutes processing time for most documents' },
                { icon: MapPin, title: 'Brgy. Bakakeng', desc: 'Baguio City, Benguet, Cordillera Administrative Region' },
                { icon: Phone, title: 'Contact Us', desc: 'Visit the barangay hall for pick-up and assistance' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl border border-slate-200 bg-white">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(244,169,0,0.1)' }}>
                    <Icon className="w-5 h-5" style={{ color: '#d99400' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            <button onClick={() => setStep('home')} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">← Back to Home</button>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b" style={{ background: 'var(--navy)' }}>
                <h2 className="font-display text-xl text-white">Document Request Form</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Fill in all required fields. A control number will be issued upon submission.</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Personal Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>First Name *</Label>
                      <Input {...register('first_name')} placeholder="Juan" />
                      {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name *</Label>
                      <Input {...register('last_name')} placeholder="Dela Cruz" />
                      {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Middle Name</Label>
                      <Input {...register('middle_name')} placeholder="Santos" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date of Birth</Label>
                      <Input type="date" {...register('date_of_birth')} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Address & Contact</p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Complete Address *</Label>
                      <Input {...register('address')} placeholder="House No., Street, Brgy. Bakakeng" />
                      {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Purok</Label>
                        <Select onValueChange={(v) => setValue('purok', v)}>
                          <SelectTrigger><SelectValue placeholder="Select purok" /></SelectTrigger>
                          <SelectContent>{PUROKS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact Number *</Label>
                        <Input {...register('contact_number')} placeholder="09XX XXX XXXX" />
                        {errors.contact_number && <p className="text-xs text-red-500">{errors.contact_number.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" {...register('email')} placeholder="juan@email.com" />
                      {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Document Details</p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Document Type *</Label>
                      <Select
                        value={selectedDocType || undefined}
                        onValueChange={(v) => {
                          setSelectedDocType(v as DocumentType);
                          setValue('document_type', v as DocumentType);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.document_type && <p className="text-xs text-red-500">{errors.document_type.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Purpose *</Label>
                      <Textarea {...register('purpose')} placeholder="State the purpose (e.g., Employment requirement, School requirement...)" rows={3} />
                      {errors.purpose && <p className="text-xs text-red-500">{errors.purpose.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg text-sm" style={{ background: 'rgba(15,45,94,0.04)', borderLeft: '3px solid var(--navy)' }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--navy)' }} />
                  <div className="text-slate-600">
                    <strong style={{ color: 'var(--navy)' }}>Note:</strong> Visit the barangay hall to claim your document. Bring a valid ID.
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <>Submit Request<ChevronRight className="w-4 h-4" /></>}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && submitted && (
          <div className="max-w-lg mx-auto text-center animate-fade-up pt-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(5,150,105,0.1)' }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--navy)' }}>Request Submitted!</h2>
            <p className="text-slate-500 mb-8">Your document request has been received. Save your control number below.</p>

            <div className="bg-white border-2 rounded-2xl p-6 mb-6" style={{ borderColor: 'var(--navy)' }}>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Control Number</p>
              <p className="font-display text-3xl font-bold" style={{ color: 'var(--navy)' }}>{submitted.control_number}</p>
              <p className="text-xs text-slate-400 mt-2">Submitted {formatDateTime(submitted.created_at)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Document</span>
                <span className="font-medium">{DOCUMENT_TYPE_LABELS[submitted.document_type]}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <Badge variant="pending">Pending</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resident</span>
                <span className="font-medium">{submitted.residents?.first_name} {submitted.residents?.last_name}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setStep('track'); setTrackNumber(submitted.control_number); }}>Track Status</Button>
              <Button className="flex-1" onClick={() => setStep('form')}>New Request</Button>
            </div>
          </div>
        )}

        {/* TRACK */}
        {step === 'track' && (
          <div className="max-w-lg mx-auto animate-fade-up">
            <button onClick={() => setStep('home')} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">← Back to Home</button>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b" style={{ background: 'var(--navy)' }}>
                <h2 className="font-display text-xl text-white">Track Your Request</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Enter your control number (e.g., BKK-2024-00001)</p>
              </div>
              <div className="p-6">
                <div className="flex gap-2 mb-6">
                  <Input value={trackNumber} onChange={(e) => setTrackNumber(e.target.value.toUpperCase())} placeholder="BKK-2024-00001" onKeyDown={(e) => e.key === 'Enter' && handleTrack()} className="font-mono" />
                  <Button onClick={handleTrack} disabled={tracking}>
                    {tracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {trackError && (
                  <div className="flex gap-2 p-4 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{trackError}
                  </div>
                )}

                {trackResult && statusConfig && (
                  <div className="space-y-4 animate-fade-in">
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusConfig.bg}`}>
                      <span className={`status-dot ${trackResult.status}`}></span>
                      <div>
                        <p className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</p>
                        <p className="text-xs text-slate-500">Last updated: {formatDateTime(trackResult.updated_at)}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm border border-slate-100">
                      {[
                        { label: 'Control Number', value: trackResult.control_number, mono: true },
                        { label: 'Document Type', value: DOCUMENT_TYPE_LABELS[trackResult.document_type] },
                        { label: 'Resident', value: `${trackResult.residents?.first_name} ${trackResult.residents?.last_name}` },
                        { label: 'Submitted', value: formatDateTime(trackResult.created_at) },
                        ...(trackResult.processed_at ? [{ label: 'Processed', value: formatDateTime(trackResult.processed_at) }] : []),
                        ...(trackResult.released_at ? [{ label: 'Released', value: formatDateTime(trackResult.released_at) }] : []),
                        ...(trackResult.rejection_reason ? [{ label: 'Reason', value: trackResult.rejection_reason }] : []),
                      ].map(({ label, value, mono }, i) => (
                        <div key={i} className="flex justify-between gap-4">
                          <span className="text-slate-500 shrink-0">{label}</span>
                          <span className={`font-medium text-right ${mono ? 'font-mono text-[#0F2D5E]' : ''}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {trackResult.status === 'ready' && (
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium">
                        ✓ Ready for Release — Please visit the barangay hall. Bring a valid ID.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Barangay Bakakeng</p>
            <p className="text-xs text-slate-400">Baguio City, Benguet, Cordillera Administrative Region</p>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Brgy. Bakakeng. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}