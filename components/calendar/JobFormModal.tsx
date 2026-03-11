'use client';

import { useState, useEffect } from 'react';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useEstimateStore } from '@/lib/stores/estimate-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export function JobFormModal() {
  const { formOpen, formEditId, closeForm, createJob, updateJob, jobs, selectedDate } =
    useCalendarStore();
  const { estimates, fetchEstimates } = useEstimateStore();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [estimateId, setEstimateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formOpen) {
      fetchEstimates().catch(() => {});

      if (formEditId) {
        const job = jobs.find((j) => j.id === formEditId);
        if (job) {
          setClientName(job.clientName);
          setClientEmail(job.clientEmail || '');
          setClientPhone(job.clientPhone || '');
          setTitle(job.title);
          setDescription(job.description || '');
          // Parse as UTC to avoid timezone shift (dates are stored as UTC midnight)
          const d = new Date(job.scheduledDate);
          setScheduledDate(
            `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
          );
          setStartTime(job.startTime);
          setEndTime(job.endTime);
          setLocation(job.location);
          setNotes(job.notes || '');
          setEstimateId(job.estimateId || '');
        }
      } else {
        // New job — reset form
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setTitle('');
        setDescription('');
        setScheduledDate(selectedDate || '');
        setStartTime('09:00');
        setEndTime('12:00');
        setLocation('');
        setNotes('');
        setEstimateId('');
      }
      setError('');
      setSaving(false);
    }
  }, [formOpen, formEditId, jobs, selectedDate, fetchEstimates]);

  const handleEstimateSelect = (id: string) => {
    setEstimateId(id);
    const est = estimates.find((e) => e.id === id);
    if (est) {
      setClientName(est.clientName);
      setClientEmail(est.clientEmail || '');
      setClientPhone(est.clientPhone || '');
      setTitle(est.scopeOfWork.slice(0, 80));
      setDescription(est.scopeOfWork);
      setLocation(`${est.projectAddress}, ${est.city}${est.state ? `, ${est.state}` : ''}`);
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !title.trim() || !scheduledDate || !location.trim()) {
      setError('Please fill in client name, title, date, and location');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        estimateId: estimateId || undefined,
        clientName,
        clientEmail,
        clientPhone,
        title,
        description,
        scheduledDate,
        startTime,
        endTime,
        location,
        notes,
      };

      if (formEditId) {
        await updateJob(formEditId, data);
      } else {
        await createJob(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  if (!formOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-background-tertiary border border-border-primary rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-background-secondary rounded-t-lg">
          <h3 className="text-sm font-semibold text-text-primary">
            {formEditId ? 'Edit Job' : 'Schedule Job'}
          </h3>
          <button
            onClick={closeForm}
            className="p-1 rounded hover:bg-background-elevated text-text-tertiary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Link to estimate */}
          {!formEditId && estimates.length > 0 && (
            <div>
              <label className="text-xs text-text-tertiary block mb-1">
                Link to Estimate (optional)
              </label>
              <select
                value={estimateId}
                onChange={(e) => handleEstimateSelect(e.target.value)}
                className="w-full h-10 rounded-lg border border-border-primary bg-background-elevated px-3 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">— Select an estimate —</option>
                {estimates.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.clientName} — {est.scopeOfWork.slice(0, 50)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">Client Name *</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1">Client Email</label>
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Client Phone</label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Job Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Install exterior lights" />
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Date *</label>
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1">End Time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Location *</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address" />
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope of work..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs text-text-tertiary block mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
            />
          </div>
        </div>

        {/* Error */}
        {error && <div className="px-4 py-2 text-xs text-accent-danger">{error}</div>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <Button variant="outline" size="sm" onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : formEditId ? 'Update Job' : 'Schedule Job'}
          </Button>
        </div>
      </div>
    </div>
  );
}
