'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/pricing/formatters';
import { ArrowLeft, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { Client } from '@/types/client';
import { Estimate } from '@/types/estimate';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientRes, estimatesRes] = await Promise.all([
        fetch(`/api/clients/${params.id}`),
        fetch(`/api/clients/${params.id}/estimates`),
      ]);

      if (!clientRes.ok) throw new Error('Client not found');

      const { data: clientData } = await clientRes.json();
      const { data: estimatesData } = await estimatesRes.json();

      setClient(clientData);
      setEstimates(estimatesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const response = await fetch(`/api/clients/${params.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete client');
      router.push('/clients');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error || !client) return <ErrorMessage error={error || 'Client not found'} onRetry={fetchData} />;

  const totalValue = estimates.reduce((sum, est) => sum + (est.pricing?.total || 0), 0);

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">{client.name}</h1>
            <div className="flex gap-4 text-text-secondary text-sm">
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDelete} className="text-accent-danger hover:text-accent-danger">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Link href={`/clients/${params.id}/edit`}>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
        </div>

        {/* Estimate History */}
        <h2 className="text-xl font-semibold text-text-primary mb-4">Estimate History</h2>
        {estimates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-secondary">No estimates found for this client.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {estimates.map((estimate) => (
              <Link key={estimate.id} href={`/estimates/${estimate.id}`}>
                <Card className="hover:border-accent-primary/50 transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base">
                            {estimate.projectAddress}, {estimate.city}
                          </CardTitle>
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
                        <CardDescription className="line-clamp-1">
                          {estimate.scopeOfWork}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-accent-primary">
                          {formatCurrency(estimate.pricing?.total || 0)}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(estimate.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
