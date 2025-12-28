'use client';

import { useState, useEffect } from 'react';
import { useTemplateStore } from '@/lib/stores/template-store';
import { WorkType } from '@/types/estimate';
import { ScopeTemplate } from '@/types/template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Package, X } from 'lucide-react';

interface TemplateSelectorProps {
  workType: WorkType;
  onSelectTemplate: (template: ScopeTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ workType, onSelectTemplate, onClose }: TemplateSelectorProps) {
  const { templates, fetchTemplates, useTemplate, getTemplatesByWorkType } = useTemplateStore();
  const [filteredTemplates, setFilteredTemplates] = useState<ScopeTemplate[]>([]);

  useEffect(() => {
    fetchTemplates(workType);
  }, [fetchTemplates, workType]);

  useEffect(() => {
    setFilteredTemplates(getTemplatesByWorkType(workType));
  }, [templates, workType, getTemplatesByWorkType]);

  const handleSelect = async (template: ScopeTemplate) => {
    try {
      // Track usage
      const updatedTemplate = await useTemplate(template.id);
      onSelectTemplate(updatedTemplate);
      onClose();
    } catch (error) {
      console.error('Failed to track template usage:', error);
      // Still apply template even if tracking fails
      onSelectTemplate(template);
      onClose();
    }
  };

  if (filteredTemplates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>No Templates Found</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            No templates available for this work type. Create one in Settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-accent-primary/30">
      <CardHeader className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Choose a Template
            </CardTitle>
            <CardDescription>
              Select a template to pre-fill scope, materials, and labor
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-border-primary rounded-lg hover:border-accent-primary cursor-pointer transition-colors"
              onClick={() => handleSelect(template)}
            >
              <h4 className="font-semibold text-text-primary mb-2">{template.name}</h4>
              {template.description && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{template.suggestedLaborHours}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span>{template.materials.length} items</span>
                </div>
                {template.usageCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Used {template.usageCount}x
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
