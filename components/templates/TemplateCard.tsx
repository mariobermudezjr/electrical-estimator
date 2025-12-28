'use client';

import { ScopeTemplate } from '@/types/template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Clock, Package } from 'lucide-react';

interface TemplateCardProps {
  template: ScopeTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onSelect?: () => void; // Optional: for selection in estimate form
}

export function TemplateCard({ template, onEdit, onDelete, onSelect }: TemplateCardProps) {
  const workTypeLabels: Record<string, string> = {
    residential_panel_upgrade: 'Panel Upgrade',
    residential_rewiring: 'Rewiring',
    residential_outlets: 'Outlets',
    service_call: 'Service Call',
    repair: 'Repair',
    commercial_office: 'Office',
    commercial_retail: 'Retail',
    commercial_industrial: 'Industrial',
  };

  return (
    <Card className="hover:border-accent-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base mb-2">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="text-sm line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2 ml-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-accent-danger hover:text-accent-danger"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3" onClick={onSelect}>
        {/* Work Type Tags */}
        <div className="flex flex-wrap gap-2">
          {template.workTypes.map((wt) => (
            <Badge key={wt} variant="secondary" className="text-xs">
              {workTypeLabels[wt] || wt}
            </Badge>
          ))}
        </div>

        {/* Template Stats */}
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{template.suggestedLaborHours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>{template.materials.length} materials</span>
          </div>
          {template.usageCount > 0 && (
            <div className="text-xs">
              Used {template.usageCount}x
            </div>
          )}
        </div>

        {/* Scope Preview */}
        <p className="text-sm text-text-secondary line-clamp-2 mt-2">
          {template.scopeText}
        </p>
      </CardContent>
    </Card>
  );
}
