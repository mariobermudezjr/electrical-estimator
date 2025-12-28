'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEstimateStore } from '@/lib/stores/estimate-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { calculateEstimate } from '@/lib/pricing/calculator';
import { formatCurrency } from '@/lib/pricing/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkType } from '@/types/estimate';
import { ArrowLeft, Plus, Trash2, Save, DollarSign } from 'lucide-react';
import { AIPricingCard } from '@/components/estimates/AIPricingCard';

export default function EditEstimatePage() {
  const params = useParams();
  const router = useRouter();
  const { getEstimate, updateEstimate } = useEstimateStore();
  const { settings } = useSettingsStore();

  const estimate = getEstimate(params.id as string);

  // Form state - initialize with existing estimate data
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [workType, setWorkType] = useState<WorkType>(WorkType.RESIDENTIAL_PANEL_UPGRADE);
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [laborHours, setLaborHours] = useState<number>(8);
  const [hourlyRate, setHourlyRate] = useState<number>(settings.defaultHourlyRate);
  const [markupPercentage, setMarkupPercentage] = useState<number>(settings.defaultMarkupPercentage);
  const [materials, setMaterials] = useState<Array<{
    description: string;
    quantity: number;
    unitCost: number;
  }>>([]);

  // Load estimate data on mount
  useEffect(() => {
    if (estimate) {
      setClientName(estimate.clientName);
      setClientPhone(estimate.clientPhone || '');
      setClientEmail(estimate.clientEmail || '');
      setProjectAddress(estimate.projectAddress);
      setCity(estimate.city);
      setState(estimate.state || '');
      setWorkType(estimate.workType);
      setScopeOfWork(estimate.scopeOfWork);
      setLaborHours(estimate.pricing.labor.hours);
      setHourlyRate(estimate.pricing.labor.hourlyRate);
      setMarkupPercentage(estimate.pricing.markupPercentage);

      // Convert line items to materials array
      const materialItems = estimate.pricing.materials.items.map(item => ({
        description: item.description || '',
        quantity: item.quantity,
        unitCost: item.unitCost,
      }));
      setMaterials(materialItems);
    }
  }, [estimate]);

  // Redirect if estimate not found
  if (!estimate) {
    return (
      <div className="min-h-screen bg-background-primary p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Estimate Not Found
            </h2>
            <p className="text-text-secondary mb-6">
              The estimate you're trying to edit doesn't exist.
            </p>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate pricing in real-time
  const pricing = calculateEstimate({
    laborHours,
    hourlyRate,
    materialItems: materials,
    markupPercentage,
  });

  const addMaterial = () => {
    setMaterials([...materials, { description: '', quantity: 1, unitCost: 0 }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: string, value: string | number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const handleSave = async () => {
    if (!clientName || !projectAddress || !city || !scopeOfWork) {
      alert('Please fill in all required fields');
      return;
    }

    const updates = {
      clientName,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      projectAddress,
      city,
      state: state || undefined,
      workType,
      scopeOfWork,
      pricing,
    };

    try {
      await updateEstimate(estimate.id, updates);
      router.push(`/estimates/${estimate.id}`);
    } catch (error) {
      alert('Failed to update estimate. Please try again.');
      console.error('Update estimate error:', error);
    }
  };

  const workTypeOptions = [
    { value: WorkType.RESIDENTIAL_PANEL_UPGRADE, label: 'Residential - Panel Upgrade' },
    { value: WorkType.RESIDENTIAL_REWIRING, label: 'Residential - Rewiring' },
    { value: WorkType.RESIDENTIAL_OUTLETS, label: 'Residential - Outlets/Switches' },
    { value: WorkType.SERVICE_CALL, label: 'Service Call' },
    { value: WorkType.REPAIR, label: 'Repair' },
    { value: WorkType.COMMERCIAL_OFFICE, label: 'Commercial - Office' },
    { value: WorkType.COMMERCIAL_RETAIL, label: 'Commercial - Retail' },
    { value: WorkType.COMMERCIAL_INDUSTRIAL, label: 'Commercial - Industrial' },
  ];

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/estimates/${estimate.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Edit Estimate</h1>
            <p className="text-text-secondary">
              Update the estimate details for {estimate.clientName}
            </p>
          </div>
          <Button onClick={handleSave} size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>Update the customer's contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Update the electrical work details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectAddress">Project Address *</Label>
                  <Input
                    id="projectAddress"
                    value={projectAddress}
                    onChange={(e) => setProjectAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Los Angeles"
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="CA"
                      maxLength={2}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="workType">Work Type *</Label>
                  <Select
                    id="workType"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value as WorkType)}
                    className="mt-1.5"
                  >
                    {workTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scopeOfWork">Scope of Work *</Label>
                  <Textarea
                    id="scopeOfWork"
                    value={scopeOfWork}
                    onChange={(e) => setScopeOfWork(e.target.value)}
                    placeholder="Describe the electrical work in detail..."
                    className="mt-1.5 min-h-32"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Labor */}
            <Card>
              <CardHeader>
                <CardTitle>Labor</CardTitle>
                <CardDescription>Update labor hours and rate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="laborHours">Hours</Label>
                    <Input
                      id="laborHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={laborHours}
                      onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="bg-background-elevated p-3 rounded-lg">
                  <div className="text-sm text-text-secondary">Labor Total</div>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatCurrency(pricing.labor.total)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Materials</CardTitle>
                    <CardDescription>Update materials and supplies</CardDescription>
                  </div>
                  <Button onClick={addMaterial} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {materials.length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">
                    No materials added yet. Click "Add Material" to get started.
                  </p>
                ) : (
                  materials.map((material, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <Input
                          value={material.description}
                          onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="Qty"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.unitCost}
                          onChange={(e) => updateMaterial(index, 'unitCost', parseFloat(e.target.value) || 0)}
                          placeholder="Unit Cost"
                        />
                      </div>
                      <Button
                        onClick={() => removeMaterial(index)}
                        variant="ghost"
                        size="icon"
                        className="text-accent-danger hover:text-accent-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
                {materials.length > 0 && (
                  <div className="bg-background-elevated p-3 rounded-lg mt-4">
                    <div className="text-sm text-text-secondary">Materials Total</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {formatCurrency(pricing.materials.subtotal)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Markup */}
            <Card>
              <CardHeader>
                <CardTitle>Markup</CardTitle>
                <CardDescription>Update profit margin</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="markup">Markup Percentage (%)</Label>
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card className="border-accent-primary/30">
                <CardHeader className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10">
                  <div className="flex items-center gap-2 text-accent-primary mb-2">
                    <DollarSign className="w-5 h-5" />
                    <CardTitle>Pricing Summary</CardTitle>
                  </div>
                  <CardDescription>Real-time estimate calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Labor</span>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(pricing.labor.total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Materials</span>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(pricing.materials.subtotal)}
                      </span>
                    </div>
                    <div className="border-t border-border-primary pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Subtotal</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(pricing.subtotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        Markup ({markupPercentage}%)
                      </span>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(pricing.markupAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t-2 border-accent-primary/30 pt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-semibold text-text-primary">Total</span>
                      <span className="text-3xl font-bold text-accent-primary">
                        {formatCurrency(pricing.total)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-text-tertiary text-center pt-2">
                    All amounts in USD
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6">
                <AIPricingCard
                  scopeOfWork={scopeOfWork}
                  city={city}
                  workType={workType}
                  currentTotal={pricing.total}
                  estimateId={params.id as string}
                  initialPricingData={estimate?.aiPricing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
