'use client';

import { useState } from 'react';
import { useTemplateStore } from '@/lib/stores/template-store';
import { ScopeTemplate, CreateTemplateInput, TemplateMaterial } from '@/types/template';
import { WorkType } from '@/types/estimate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface TemplateFormProps {
  template?: ScopeTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

export function TemplateForm({ template, onClose, onSave }: TemplateFormProps) {
  const { addTemplate, updateTemplate } = useTemplateStore();
  const isEditing = !!template;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<WorkType[]>(
    template?.workTypes || [WorkType.RESIDENTIAL_PANEL_UPGRADE]
  );
  const [scopeText, setScopeText] = useState(template?.scopeText || '');
  const [laborHours, setLaborHours] = useState(template?.suggestedLaborHours || 8);
  const [materials, setMaterials] = useState<TemplateMaterial[]>(
    template?.materials || []
  );

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

  const toggleWorkType = (workType: WorkType) => {
    setSelectedWorkTypes((prev) =>
      prev.includes(workType)
        ? prev.filter((wt) => wt !== workType)
        : [...prev, workType]
    );
  };

  const addMaterial = () => {
    setMaterials([...materials, { description: '', quantity: 1, unitCost: 0 }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof TemplateMaterial, value: string | number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const handleSave = async () => {
    if (!name || !scopeText || selectedWorkTypes.length === 0) {
      alert('Please fill in name, scope, and select at least one work type');
      return;
    }

    const templateData: CreateTemplateInput = {
      name,
      description: description || undefined,
      workTypes: selectedWorkTypes,
      scopeText,
      suggestedLaborHours: laborHours,
      materials,
    };

    try {
      if (isEditing && template) {
        await updateTemplate(template.id, templateData);
      } else {
        await addTemplate(templateData);
      }
      onSave();
    } catch (error) {
      alert('Failed to save template. Please try again.');
      console.error('Save template error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text-primary">
            {isEditing ? 'Edit Template' : 'New Template'}
          </h2>
          <p className="text-text-secondary">
            Create a reusable template for common electrical work
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Give your template a name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electrical Main Panel Upgrade"
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              className="mt-1.5 min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Types */}
      <Card>
        <CardHeader>
          <CardTitle>Applicable Work Types *</CardTitle>
          <CardDescription>Select which work types this template applies to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {workTypeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer p-3 rounded border border-border-primary hover:border-accent-primary transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedWorkTypes.includes(option.value)}
                  onChange={() => toggleWorkType(option.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text-primary">{option.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scope of Work */}
      <Card>
        <CardHeader>
          <CardTitle>Scope of Work *</CardTitle>
          <CardDescription>Default scope text for this template</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            placeholder="Describe the electrical work in detail..."
            className="min-h-32"
            required
          />
        </CardContent>
      </Card>

      {/* Labor Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Labor Hours</CardTitle>
          <CardDescription>Typical time required for this work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-48">
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
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Materials</CardTitle>
              <CardDescription>Standard materials for this template</CardDescription>
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
              <div key={index} className="space-y-2 p-3 border border-border-primary rounded">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Input
                      value={material.description}
                      onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
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
                {/* Optional notes field */}
                <Input
                  value={material.notes || ''}
                  onChange={(e) => updateMaterial(index, 'notes', e.target.value)}
                  placeholder="Notes (optional)"
                  className="text-sm"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
