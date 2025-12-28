'use client';

import { useState, useEffect } from 'react';
import { useTemplateStore } from '@/lib/stores/template-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { TemplateForm } from './TemplateForm';
import { TemplateCard } from './TemplateCard';
import { ScopeTemplate } from '@/types/template';

export function TemplateManager() {
  const { templates, fetchTemplates, deleteTemplate, isLoading } = useTemplateStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScopeTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (template: ScopeTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteTemplate(id);
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  if (showForm) {
    return (
      <TemplateForm
        template={editingTemplate}
        onClose={handleFormClose}
        onSave={() => {
          handleFormClose();
          fetchTemplates();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scope of Work Templates</CardTitle>
              <CardDescription>
                Create reusable templates for common electrical jobs
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-tertiary mb-4">No templates created yet</p>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template)}
                  onDelete={() => handleDelete(template.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
