'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkType, AIPricingData } from '@/types/estimate';
import { formatCurrency } from '@/lib/pricing/formatters';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface AIPricingCardProps {
  scopeOfWork: string;
  city: string;
  workType: WorkType;
  currentTotal: number;
  estimateId?: string;
  initialPricingData?: AIPricingData | null;
  onApplySuggestion?: (suggestedPrice: number) => void;
}

export function AIPricingCard({
  scopeOfWork,
  city,
  workType,
  currentTotal,
  estimateId,
  initialPricingData = null,
  onApplySuggestion,
}: AIPricingCardProps) {
  // Validate initial pricing data has required fields
  const validatedInitialData =
    initialPricingData &&
    initialPricingData.priceRange &&
    initialPricingData.averagePrice !== undefined
      ? initialPricingData
      : null;

  const [isLoading, setIsLoading] = useState(false);
  const [pricingData, setPricingData] = useState<AIPricingData | null>(validatedInitialData);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    if (!scopeOfWork || !city) {
      alert('Please fill in Scope of Work and City before researching pricing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeOfWork,
          city,
          workType,
          estimateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to research pricing');
      }

      const { data } = await response.json();
      setPricingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research pricing');
      console.error('AI Pricing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-orange-400';
      default:
        return 'text-text-secondary';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'medium':
        return <TrendingUp className="w-4 h-4" />;
      case 'low':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getDifference = () => {
    if (!pricingData) return null;
    const diff = currentTotal - pricingData.averagePrice;
    const percentage = (diff / pricingData.averagePrice) * 100;
    return { amount: diff, percentage };
  };

  const difference = getDifference();

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 text-purple-400 mb-2">
          <Sparkles className="w-5 h-5" />
          <CardTitle>AI Pricing Research</CardTitle>
        </div>
        <CardDescription>
          Get AI-powered pricing insights for similar projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pricingData && !error && (
          <Button
            onClick={handleResearch}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Researching Pricing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Research Pricing with AI
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <strong className="text-text-primary">Error:</strong> {error}
            </div>
          </div>
        )}

        {pricingData && pricingData.priceRange && pricingData.averagePrice !== undefined && (
          <div className="space-y-4">
            {/* AI Suggested Price Range */}
            <div className="bg-background-elevated p-4 rounded-lg border border-purple-500/20">
              <div className="text-sm text-text-secondary mb-2">AI Suggested Price Range</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-purple-400">
                  {formatCurrency(pricingData.priceRange.min)}
                </span>
                <span className="text-text-tertiary">-</span>
                <span className="text-2xl font-bold text-purple-400">
                  {formatCurrency(pricingData.priceRange.max)}
                </span>
              </div>
              <div className="text-xs text-text-tertiary">
                Average: {formatCurrency(pricingData.averagePrice)}
              </div>
            </div>

            {/* Confidence Level */}
            <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
              <span className="text-sm text-text-secondary">Confidence Level</span>
              <div className={`flex items-center gap-2 ${getConfidenceColor(pricingData.confidence)}`}>
                {getConfidenceIcon(pricingData.confidence)}
                <span className="font-medium capitalize">{pricingData.confidence}</span>
              </div>
            </div>

            {/* Comparison with Current Estimate */}
            {difference && (
              <div className="bg-background-elevated p-4 rounded-lg border border-border-primary">
                <div className="text-sm text-text-secondary mb-2">Comparison</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">Your Estimate</span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency(currentTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">AI Average</span>
                    <span className="font-medium text-text-primary">
                      {formatCurrency(pricingData.averagePrice)}
                    </span>
                  </div>
                  <div className="border-t border-border-primary pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-tertiary">Difference</span>
                      <span
                        className={`font-semibold ${
                          difference.amount > 0 ? 'text-green-400' : 'text-orange-400'
                        }`}
                      >
                        {difference.amount > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(difference.amount))}
                        <span className="text-xs ml-1">
                          ({difference.percentage > 0 ? '+' : ''}
                          {difference.percentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                {difference.amount > 0 ? (
                  <div className="mt-3 text-xs text-green-400 flex items-start gap-2">
                    <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Your estimate is above market average</span>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-orange-400 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Your estimate is below market average</span>
                  </div>
                )}
              </div>
            )}

            {/* Sources */}
            {pricingData.sources && pricingData.sources.length > 0 && (
              <div className="bg-background-elevated p-4 rounded-lg">
                <div className="text-sm font-medium text-text-primary mb-2">Sources</div>
                <ul className="space-y-2 text-xs text-text-secondary">
                  {pricingData.sources.map((source, index) => (
                    <li key={index} className="flex flex-col gap-1 border-l-2 border-purple-500/30 pl-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-text-primary">{source.source}</span>
                        <span className="text-purple-400">{formatCurrency(source.price)}</span>
                      </div>
                      <div className="text-text-tertiary">{source.description}</div>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View source
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleResearch}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={isLoading}
              >
                Refresh Research
              </Button>
              {onApplySuggestion && (
                <Button
                  onClick={() => onApplySuggestion(pricingData.averagePrice)}
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Use AI Average
                </Button>
              )}
            </div>

            <div className="text-xs text-text-tertiary text-center">
              Last updated: {new Date(pricingData.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
