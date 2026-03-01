'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/pricing/formatters';
import { ArrowLeft, Plus, Users, Download } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorMessage } from '@/components/ui/error-message';

interface ClientWithStats {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  estimateCount: number;
  totalValue: number;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients?withStats=true');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const { data } = await response.json();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const response = await fetch('/api/clients/migrate', { method: 'POST' });
      if (!response.ok) throw new Error('Migration failed');
      const { data } = await response.json();
      alert(`Migration complete: ${data.clientsCreated} clients created, ${data.estimatesLinked} estimates linked.`);
      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} onRetry={fetchClients} />;

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Clients</h1>
            <p className="text-text-secondary">
              Manage your client directory
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleMigrate} disabled={isMigrating}>
              <Download className="w-4 h-4 mr-2" />
              {isMigrating ? 'Importing...' : 'Import from Estimates'}
            </Button>
            <Link href="/clients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                No clients yet
              </h3>
              <p className="text-text-secondary mb-6 text-center max-w-md">
                Add your first client or import existing clients from your estimates.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleMigrate} disabled={isMigrating}>
                  <Download className="w-4 h-4 mr-2" />
                  Import from Estimates
                </Button>
                <Link href="/clients/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {clients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="hover:border-accent-primary/50 transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{client.name}</CardTitle>
                        <CardDescription>
                          {[client.email, client.phone].filter(Boolean).join(' | ') || 'No contact info'}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent-primary">
                          {client.estimateCount}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {client.estimateCount === 1 ? 'estimate' : 'estimates'} | {formatCurrency(client.totalValue)}
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
