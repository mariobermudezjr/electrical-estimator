'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEstimateStore } from '@/lib/stores/estimate-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/pricing/formatters';
import { generateEstimatePDF, downloadPDF } from '@/lib/export/pdf-service';
import { generateEstimateExcel, downloadExcel } from '@/lib/export/excel-service';
import { ArrowLeft, Download, FileText, Trash2, Edit } from 'lucide-react';

export default function EstimateViewPage() {
  const params = useParams();
  const router = useRouter();
  const { getEstimate, deleteEstimate } = useEstimateStore();
  const { settings } = useSettingsStore();

  const estimate = getEstimate(params.id as string);

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

  const handleExportPDF = () => {
    const blob = generateEstimatePDF(estimate, settings);
    const filename = `estimate-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.pdf`;
    downloadPDF(blob, filename);
  };

  const handleExportExcel = () => {
    const blob = generateEstimateExcel(estimate);
    const filename = `estimate-${estimate.clientName.replace(/\s+/g, '-')}-${estimate.id}.xlsx`;
    downloadExcel(blob, filename);
  };

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
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-1">
                {estimate.clientName}
              </h1>
              <p className="text-text-secondary">
                Created {new Date(estimate.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDelete} className="text-accent-danger">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Link href={`/estimates/${estimate.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileText className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Client & Project Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Details</CardTitle>
                <Badge
                  variant={
                    estimate.status === 'approved' ? 'success' :
                    estimate.status === 'sent' ? 'default' :
                    estimate.status === 'rejected' ? 'danger' :
                    'warning'
                  }
                >
                  {estimate.status}
                </Badge>
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
        </div>
      </div>
    </div>
  );
}
