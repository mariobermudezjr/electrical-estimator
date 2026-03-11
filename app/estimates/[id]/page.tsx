'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useEstimateStore } from '@/lib/stores/estimate-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/pricing/formatters';
import { generateEstimatePDF, generateInvoicePDF, downloadPDF, loadImageAsDataUrl } from '@/lib/export/pdf-service';
import { generateEstimateExcel, generateInvoiceExcel, downloadExcel } from '@/lib/export/excel-service';
import Image from 'next/image';
import { ArrowLeft, Download, FileText, Trash2, Edit, Upload, X, Send, CheckCircle, XCircle, Mail, ChevronDown, DollarSign, Plus, ImageIcon, Save } from 'lucide-react';
import { ReceiptImage, Payment } from '@/types/estimate';

export default function EstimateViewPage() {
  const params = useParams();
  const router = useRouter();
  const { getEstimate, deleteEstimate, updateEstimate, fetchEstimates } = useEstimateStore();
  const { settings, fetchSettings } = useSettingsStore();

  const [receipts, setReceipts] = useState<ReceiptImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [noteImages, setNoteImages] = useState<ReceiptImage[]>([]);
  const [uploadingNoteImage, setUploadingNoteImage] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteImagePreview, setNoteImagePreview] = useState<string | null>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);

  const estimate = getEstimate(params.id as string);

  const fetchReceipts = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/estimates/${params.id}/receipts`);
      if (res.ok) {
        const { data } = await res.json();
        setReceipts(data);
      }
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
    }
  }, [params.id]);

  const fetchNoteImages = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/estimates/${params.id}/note-images`);
      if (res.ok) {
        const { data } = await res.json();
        setNoteImages(data);
      }
    } catch (err) {
      console.error('Failed to fetch note images:', err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReceipts();
    fetchNoteImages();
    fetchSettings().catch(() => {});
  }, [fetchReceipts, fetchNoteImages, fetchSettings]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  if (!estimate) {
    return (
      <div className="min-h-screen bg-background-primary p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Estimate Not Found
            </h2>
            <p className="text-text-secondary mb-6">
              The estimate you're looking for doesn't exist.
            </p>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this estimate?')) {
      try {
        await deleteEstimate(estimate.id);
        router.push('/');
      } catch (error) {
        alert('Failed to delete estimate. Please try again.');
        console.error('Delete estimate error:', error);
      }
    }
  };

  const handleStatusChange = async (newStatus: 'sent' | 'approved' | 'rejected' | 'completed_paid' | 'completed_unpaid') => {
    setUpdatingStatus(true);
    try {
      await updateEstimate(estimate.id, { status: newStatus });
    } catch (error) {
      alert('Failed to update status. Please try again.');
      console.error('Update status error:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportPDF = async () => {
    let receiptDataUrls: string[] = [];
    if (receipts.length > 0) {
      const results = await Promise.all(
        receipts.map(async (r) => {
          const res = await fetch(
            `/api/estimates/${estimate.id}/receipts/${r.filename}`
          );
          if (res.ok) {
            const { data } = await res.json();
            return data as string;
          }
          return null;
        })
      );
      receiptDataUrls = results.filter((r): r is string => r !== null);
    }
    const logoDataUrl = await loadImageAsDataUrl('/charlies-electric-logo-white.png').catch(() => undefined);
    const blob = await generateEstimatePDF(estimate, settings, receiptDataUrls, logoDataUrl);
    const filename = `estimate-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.pdf`;
    downloadPDF(blob, filename);
  };

  const handleExportExcel = () => {
    const blob = generateEstimateExcel(estimate);
    const filename = `estimate-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.xlsx`;
    downloadExcel(blob, filename);
  };

  const handleInvoicePDF = async () => {
    // Fetch receipt images as base64 for PDF embedding
    let receiptDataUrls: string[] = [];
    if (receipts.length > 0) {
      const results = await Promise.all(
        receipts.map(async (r) => {
          const res = await fetch(
            `/api/estimates/${estimate.id}/receipts/${r.filename}`
          );
          if (res.ok) {
            const { data } = await res.json();
            return data as string;
          }
          return null;
        })
      );
      receiptDataUrls = results.filter((r): r is string => r !== null);
    }
    const logoDataUrl = await loadImageAsDataUrl('/charlies-electric-logo-white.png').catch(() => undefined);
    const blob = await generateInvoicePDF(estimate, settings, receiptDataUrls, logoDataUrl);
    const filename = `invoice-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.pdf`;
    downloadPDF(blob, filename);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/estimates/${estimate.id}/receipts`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error || 'Failed to upload receipt');
      } else {
        await fetchReceipts();
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload receipt');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteReceipt = async (filename: string) => {
    if (!confirm('Delete this receipt?')) return;
    try {
      const res = await fetch(
        `/api/estimates/${estimate.id}/receipts/${filename}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setReceipts((prev) => prev.filter((r) => r.filename !== filename));
      }
    } catch (err) {
      console.error('Delete receipt error:', err);
    }
  };

  const handleInvoiceExcel = () => {
    const blob = generateInvoiceExcel(estimate);
    const filename = `invoice-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.xlsx`;
    downloadExcel(blob, filename);
  };

  const handleSendToClient = async () => {
    if (!estimate.clientEmail) {
      alert('No client email address on this estimate. Please edit the estimate and add one.');
      return;
    }

    const confirmed = confirm(
      `Send estimate to ${estimate.clientName} (${estimate.clientEmail})?\n\nThis will email the estimate PDF and update the status to "sent".`
    );
    if (!confirmed) return;

    setSendingEmail(true);
    try {
      // Server generates PDF and sends email — no large payload from client
      const sendRes = await fetch(`/api/estimates/${estimate.id}/send-email`, {
        method: 'POST',
      });

      if (!sendRes.ok) {
        const errData = await sendRes.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to send email');
      }

      // Refresh estimate to reflect updated status
      await updateEstimate(estimate.id, { status: 'sent' });

      alert(`Estimate sent to ${estimate.clientEmail}`);
    } catch (error) {
      console.error('Send to client error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send estimate');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setAddingPayment(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: paymentMethod || undefined,
          note: paymentNote || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to add payment');
      }
      // Refresh estimate data
      await fetchEstimates();
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentNote('');
      setShowPaymentForm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add payment');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Remove this payment?')) return;
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/payments?paymentId=${paymentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove payment');
      await fetchEstimates();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove payment');
    }
  };

  const handleUploadNoteImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNoteImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/estimates/${estimate.id}/note-images`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to upload image');
      }
      await fetchNoteImages();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingNoteImage(false);
      if (noteImageInputRef.current) noteImageInputRef.current.value = '';
    }
  };

  const handleDeleteNoteImage = async (filename: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/note-images/${filename}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete image');
      setNoteImages((prev) => prev.filter((img) => img.filename !== filename));
      if (noteImagePreview === filename) setNoteImagePreview(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete image');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateEstimate(estimate.id, { notes: notesText });
      setEditingNotes(false);
    } catch {
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const payments = estimate.payments || [];
  const totalPaid = payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const balance = estimate.pricing.total - totalPaid;

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Image
              src="/charlies-electric-logo.png"
              alt="Charlie's Electric"
              width={48}
              height={48}
              className="rounded-md"
            />
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-1">
                {estimate.clientName}
              </h1>
              <p className="text-text-secondary">
                Created {new Date(estimate.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-accent-danger hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Link href={`/estimates/${estimate.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </Link>
            <div ref={exportRef} className="relative">
              <Button variant="outline" size="sm" onClick={() => setExportOpen(!exportOpen)}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-background-elevated border border-border-primary rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => { handleExportPDF(); setExportOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-primary transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-text-secondary" />
                    Estimate PDF
                  </button>
                  <button
                    onClick={() => { handleExportExcel(); setExportOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-primary transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-text-secondary" />
                    Estimate Excel
                  </button>
                  <div className="h-px bg-border-primary mx-2 my-1" />
                  <button
                    onClick={() => { handleInvoicePDF(); setExportOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-primary transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-text-secondary" />
                    Invoice PDF
                  </button>
                  <button
                    onClick={() => { handleInvoiceExcel(); setExportOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-primary transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-text-secondary" />
                    Invoice Excel
                  </button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSendToClient}
              disabled={sendingEmail}
              className="bg-accent-success hover:bg-accent-success/90"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              {sendingEmail ? 'Sending...' : 'Send to Client'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Client & Project Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      estimate.status === 'approved' ? 'success' :
                      estimate.status === 'completed_paid' ? 'success' :
                      estimate.status === 'completed_unpaid' ? 'warning' :
                      estimate.status === 'sent' ? 'default' :
                      estimate.status === 'rejected' ? 'danger' :
                      'warning'
                    }
                  >
                    {estimate.status === 'completed_paid' ? 'Done — Paid' :
                     estimate.status === 'completed_unpaid' ? 'Done — Unpaid' :
                     estimate.status}
                  </Badge>
                  {estimate.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('sent')}
                      disabled={updatingStatus}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Mark as Sent
                    </Button>
                  )}
                  {estimate.status === 'sent' && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleStatusChange('approved')}
                        disabled={updatingStatus}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleStatusChange('rejected')}
                        disabled={updatingStatus}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </>
                  )}
                  {estimate.status === 'approved' && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleStatusChange('completed_paid')}
                        disabled={updatingStatus}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Done — Paid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('completed_unpaid')}
                        disabled={updatingStatus}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Done — Unpaid
                      </Button>
                    </>
                  )}
                  {estimate.status === 'completed_unpaid' && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleStatusChange('completed_paid')}
                      disabled={updatingStatus}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Mark Paid
                    </Button>
                  )}
                  {estimate.status === 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('sent')}
                      disabled={updatingStatus}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-1">Client</h3>
                <p className="text-text-primary">{estimate.clientName}</p>
                {estimate.clientPhone && (
                  <p className="text-sm text-text-secondary">{estimate.clientPhone}</p>
                )}
                {estimate.clientEmail && (
                  <p className="text-sm text-text-secondary">{estimate.clientEmail}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-1">Location</h3>
                <p className="text-text-primary">{estimate.projectAddress}</p>
                <p className="text-sm text-text-secondary">
                  {estimate.city}
                  {estimate.state && `, ${estimate.state}`}
                </p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-text-secondary mb-1">Work Type</h3>
                <p className="text-text-primary">{estimate.workType.replace(/_/g, ' ')}</p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-text-secondary mb-1">Scope of Work</h3>
                <p className="text-text-primary whitespace-pre-wrap">{estimate.scopeOfWork}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
              <CardDescription>Detailed cost analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Bill of Quantity</h3>
              {/* Labor */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Labor</h3>
                  <div className="bg-background-elevated p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-text-secondary">
                        {estimate.pricing.labor.hours} hours @ ${estimate.pricing.labor.hourlyRate.toFixed(2)}/hr
                      </div>
                      <div className="font-semibold text-text-primary">
                        {formatCurrency(estimate.pricing.labor.total)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Materials</h3>
                  {estimate.pricing.materials.items.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No materials listed</p>
                  ) : (
                    <div className="space-y-2">
                      {estimate.pricing.materials.items.map((item) => (
                        <div key={item.id} className="bg-background-elevated p-3 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="text-sm text-text-primary">{item.description || 'Material'}</div>
                            <div className="text-xs text-text-tertiary">
                              {item.quantity} × ${item.unitCost.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-medium text-text-primary">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      ))}
                      <div className="bg-background-elevated p-3 rounded-lg flex justify-between items-center border border-border-primary">
                        <div className="text-sm font-medium text-text-secondary">Materials Subtotal</div>
                        <div className="font-semibold text-text-primary">
                          {formatCurrency(estimate.pricing.materials.subtotal)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="border-t border-border-primary pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Pretax Material Total</span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency(estimate.pricing.labor.total + estimate.pricing.materials.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency(estimate.pricing.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      Markup ({estimate.pricing.markupPercentage}%)
                    </span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency(estimate.pricing.markupAmount)}
                    </span>
                  </div>
                  <div className="border-t-2 border-accent-primary/30 pt-4 flex justify-between items-baseline">
                    <span className="text-xl font-semibold text-text-primary">Total</span>
                    <span className="text-4xl font-bold text-accent-primary">
                      {formatCurrency(estimate.pricing.total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>
                    {totalPaid > 0
                      ? `${formatCurrency(totalPaid)} paid of ${formatCurrency(estimate.pricing.total)} — Balance: ${formatCurrency(balance)}`
                      : 'No payments recorded'}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Payment
                </Button>
              </div>
              {/* Progress bar */}
              {totalPaid > 0 && (
                <div className="mt-3 h-2 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${balance <= 0 ? 'bg-accent-success' : 'bg-accent-primary'}`}
                    style={{ width: `${Math.min((totalPaid / estimate.pricing.total) * 100, 100)}%` }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Add Payment Form */}
              {showPaymentForm && (
                <div className="bg-background-elevated rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Amount *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      >
                        <option value="">Select...</option>
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="card">Card</option>
                        <option value="zelle">Zelle</option>
                        <option value="venmo">Venmo</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Note</label>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-background-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="success" onClick={handleAddPayment} disabled={addingPayment}>
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      {addingPayment ? 'Adding...' : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment History */}
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p: Payment) => (
                    <div key={p.id} className="flex items-center justify-between bg-background-elevated p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-success/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-accent-success" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {formatCurrency(p.amount)}
                            {p.method && (
                              <span className="ml-2 text-xs text-text-tertiary capitalize">
                                via {p.method}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {new Date(p.date).toLocaleDateString()}
                            {p.note && ` — ${p.note}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1 rounded hover:bg-background-primary text-text-tertiary hover:text-accent-danger transition-colors"
                        title="Remove payment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !showPaymentForm ? (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No payments recorded yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Notes & Photos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notes & Photos</CardTitle>
                  <CardDescription>Job site photos, reference images, and sketches</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!editingNotes ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setNotesText(estimate.notes || ''); setEditingNotes(true); }}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      {estimate.notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="success" onClick={handleSaveNotes} disabled={savingNotes}>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {savingNotes ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  )}
                  <input
                    ref={noteImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleUploadNoteImage}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingNoteImage}
                    onClick={() => noteImageInputRef.current?.click()}
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    {uploadingNoteImage ? 'Uploading...' : 'Add Photo'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Notes Text */}
              {editingNotes ? (
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Add notes about the job site, special conditions, client requests..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background-elevated border border-border-primary rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary mb-4 resize-y"
                />
              ) : estimate.notes ? (
                <p className="text-sm text-text-primary whitespace-pre-wrap mb-4">{estimate.notes}</p>
              ) : null}

              {/* Photo Gallery */}
              {noteImages.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Photos ({noteImages.length})
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {noteImages.map((img) => (
                      <NoteImageThumb
                        key={img.filename}
                        estimateId={estimate.id}
                        image={img}
                        isPreview={noteImagePreview === img.filename}
                        onPreview={() => setNoteImagePreview(noteImagePreview === img.filename ? null : img.filename)}
                        onDelete={() => handleDeleteNoteImage(img.filename)}
                      />
                    ))}
                  </div>
                </div>
              ) : !estimate.notes && !editingNotes ? (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No notes or photos yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Receipts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Receipts</CardTitle>
                  <CardDescription>Proof of purchase images (included in Invoice PDF)</CardDescription>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleUploadReceipt}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Receipt'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-sm text-text-tertiary">No receipts attached yet.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.filename}
                      className="flex items-center justify-between bg-background-elevated p-3 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{receipt.originalName}</p>
                        <p className="text-xs text-text-tertiary">
                          {(receipt.size / 1024).toFixed(1)} KB
                          {' · '}
                          {new Date(receipt.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-text-tertiary hover:text-accent-danger ml-2 shrink-0"
                        onClick={() => handleDeleteReceipt(receipt.filename)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Thumbnail component for note images with lazy-load preview
function NoteImageThumb({
  estimateId,
  image,
  isPreview,
  onPreview,
  onDelete,
}: {
  estimateId: string;
  image: ReceiptImage;
  isPreview: boolean;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadImage = async () => {
    if (src) { onPreview(); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/note-images/${image.filename}`);
      if (res.ok) {
        const { data } = await res.json();
        setSrc(data);
        onPreview();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={loadImage}
        className="w-full aspect-square bg-background-elevated rounded-lg border border-border-primary overflow-hidden flex items-center justify-center hover:border-accent-primary transition-colors"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={image.originalName} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-2">
            <ImageIcon className="w-6 h-6 text-text-tertiary mx-auto mb-1" />
            <span className="text-[10px] text-text-tertiary block truncate max-w-full">
              {loading ? 'Loading...' : image.originalName}
            </span>
          </div>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete"
      >
        <X className="w-3 h-3" />
      </button>
      {/* Expanded preview */}
      {isPreview && src && (
        <div className="absolute z-10 left-0 top-full mt-2 bg-background-elevated border border-border-primary rounded-lg shadow-xl p-2 w-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={image.originalName} className="w-full rounded" />
          <p className="text-xs text-text-tertiary mt-1 truncate">{image.originalName}</p>
        </div>
      )}
    </div>
  );
}
