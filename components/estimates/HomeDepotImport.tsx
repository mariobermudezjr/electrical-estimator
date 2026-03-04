'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/pricing/formatters';
import { Upload, Package, AlertCircle, CheckCircle2, Loader2, X, FileText } from 'lucide-react';
import type { ParseResult, ParsedItem } from '@/lib/import/homedepot-parser';

interface HomeDepotImportProps {
  onImport: (items: Array<{ description: string; quantity: number; unitCost: number }>) => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

export function HomeDepotImport({ onImport }: HomeDepotImportProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setState('loading');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/homedepot', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server error — could not parse response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF');
      }

      setResult(data.data);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
      setState('error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleAddMaterials = () => {
    if (!result) return;
    const items = result.items.map(({ description, quantity, unitCost }) => ({
      description,
      quantity,
      unitCost,
    }));
    onImport(items);
    setState('idle');
    setResult(null);
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError(null);
  };

  const formatLabel = (format: string) => {
    return format === 'share_cart' ? 'Share Cart' : 'Order Receipt';
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <Package className="w-5 h-5" />
            <CardTitle className="text-base">Home Depot Import</CardTitle>
          </div>
          {state !== 'idle' && (
            <Button variant="ghost" size="icon" onClick={handleReset} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          Upload a Share Cart email or Order Receipt PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Idle State */}
        {state === 'idle' && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full border-orange-500/30 hover:bg-orange-500/10 text-text-secondary hover:text-orange-400"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Home Depot PDF
          </Button>
        )}

        {/* Loading State */}
        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-4 text-orange-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Parsing PDF...</span>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-text-secondary">{error}</span>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="w-full border-orange-500/30 hover:bg-orange-500/10"
            >
              Try Another File
            </Button>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && result && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                {result.items.length} items found
              </span>
              <span className="text-xs text-text-tertiary">
                ({formatLabel(result.format)})
              </span>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-400">{w}</p>
                ))}
              </div>
            )}

            {/* Item Preview */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border-primary rounded-lg p-2">
              {result.items.map((item: ParsedItem, i: number) => (
                <div key={i} className="flex justify-between items-start gap-2 text-xs py-1 border-b border-border-primary last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary truncate">{item.description}</p>
                    <p className="text-text-tertiary">
                      Qty: {item.quantity} x {formatCurrency(item.unitCost)}
                    </p>
                  </div>
                  <span className="text-text-secondary font-medium whitespace-nowrap">
                    {formatCurrency(item.quantity * item.unitCost)}
                  </span>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="flex justify-between text-sm px-1">
              <span className="text-text-secondary">Subtotal</span>
              <span className="font-semibold text-text-primary">
                {formatCurrency(result.subtotal)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleAddMaterials}
                size="sm"
                className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
              >
                <FileText className="w-4 h-4 mr-1" />
                Add {result.items.length} Materials
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="border-orange-500/30 hover:bg-orange-500/10"
              >
                Try Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
