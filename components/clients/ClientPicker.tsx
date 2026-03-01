'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useClientStore } from '@/lib/stores/client-store';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface ClientPickerProps {
  selectedClientId: string;
  onSelect: (clientId: string, clientName: string, clientEmail?: string, clientPhone?: string) => void;
  fallbackClientName?: string;
}

export function ClientPicker({ selectedClientId, onSelect, fallbackClientName }: ClientPickerProps) {
  const { clients, fetchClients, isLoading } = useClientStore();

  useEffect(() => {
    if (clients.length === 0) {
      fetchClients().catch(() => {});
    }
  }, [clients.length, fetchClients]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (!clientId) {
      onSelect('', '', undefined, undefined);
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      onSelect(client.id, client.name, client.email, client.phone);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="clientPicker">Client *</Label>
        <Link
          href="/clients/new"
          className="text-xs text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add New Client
        </Link>
      </div>
      <Select
        id="clientPicker"
        value={selectedClientId}
        onChange={handleChange}
        className="mt-1.5"
      >
        <option value="">
          {isLoading ? 'Loading clients...' : 'Select a client...'}
        </option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </Select>
      {fallbackClientName && !selectedClientId && (
        <p className="text-xs text-text-tertiary">
          Previously: {fallbackClientName} (not yet linked to a client record)
        </p>
      )}
      {selectedClient && (selectedClient.phone || selectedClient.email) && (
        <div className="text-sm text-text-secondary space-y-1">
          {selectedClient.phone && <p>Phone: {selectedClient.phone}</p>}
          {selectedClient.email && <p>Email: {selectedClient.email}</p>}
        </div>
      )}
    </div>
  );
}
