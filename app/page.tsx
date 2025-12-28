'use client';

import { useEffect } from 'react';
// import { useSession } from 'next-auth/react'; // Temporarily disabled
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEstimateStore } from '@/lib/stores/estimate-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/pricing/formatters';
import { Plus, Settings, FileText } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function DashboardPage() {
  // const { data: session, status } = useSession(); // Temporarily disabled
  const router = useRouter();
  const { estimates, isLoading, error, fetchEstimates } = useEstimateStore();

  // Temporary mock session while we fix NextAuth
  const session = { user: { name: 'Test User', email: 'test@example.com' } };

  // Temporarily skip auth check while we fix NextAuth v5 beta issues
  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin');
  //   }
  // }, [status, router]);

  // Fetch estimates on mount
  useEffect(() => {
    // Skip auth check for now
    fetchEstimates();
  }, [fetchEstimates]);

  // Show loading during data fetch
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show error if fetch failed
  if (error) {
    return <ErrorMessage error={error} onRetry={fetchEstimates} />;
  }

  const totalValue = estimates.reduce((sum, est) => sum + est.pricing.total, 0);
  const draftCount = estimates.filter(est => est.status === 'draft').length;
  const sentCount = estimates.filter(est => est.status === 'sent').length;

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Electrical Estimates
            </h1>
            <p className="text-text-secondary">
              Welcome back, {session?.user?.name || session?.user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <SignOutButton variant="outline" />
            <Link href="/settings">
              <Button variant="outline" size="default">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Link href="/estimates/new">
              <Button size="default">
                <Plus className="w-4 h-4 mr-2" />
                New Estimate
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Estimates</CardDescription>
              <CardTitle className="text-3xl">{estimates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalValue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Status Breakdown</CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="warning">{draftCount} Draft</Badge>
                <Badge variant="success">{sentCount} Sent</Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Estimates List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Estimates</h2>

          {estimates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-16 h-16 text-text-tertiary mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No estimates yet
                </h3>
                <p className="text-text-secondary mb-6 text-center max-w-md">
                  Get started by creating your first electrical estimate. Add client info, scope of work, and let AI help with pricing.
                </p>
                <Link href="/estimates/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Estimate
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {estimates.map((estimate) => (
                <Link key={estimate.id} href={`/estimates/${estimate.id}`}>
                  <Card className="hover:border-accent-primary/50 transition-all cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle>{estimate.clientName}</CardTitle>
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
                          <CardDescription className="line-clamp-2">
                            {estimate.projectAddress}, {estimate.city}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent-primary">
                            {formatCurrency(estimate.pricing.total)}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {new Date(estimate.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {estimate.scopeOfWork}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-text-tertiary">
                        <span>{estimate.pricing.labor.hours} hrs labor</span>
                        <span>•</span>
                        <span>{estimate.pricing.materials.items.length} materials</span>
                        <span>•</span>
                        <span>{estimate.pricing.markupPercentage}% markup</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
