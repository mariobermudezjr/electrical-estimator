'use client';

import { useState, useEffect, useCallback } from 'react';
import { Select } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

interface PreviousAddress {
  projectAddress: string;
  city: string;
  state: string;
}

interface PreviousAddressPickerProps {
  clientId: string;
  onSelect: (address: PreviousAddress) => void;
}

export function PreviousAddressPicker({ clientId, onSelect }: PreviousAddressPickerProps) {
  const [addresses, setAddresses] = useState<PreviousAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAddresses = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/addresses`);
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data || []);
      }
    } catch {
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchAddresses(clientId);
    } else {
      setAddresses([]);
    }
  }, [clientId, fetchAddresses]);

  if (!clientId || addresses.length === 0) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && addresses[idx]) {
      onSelect(addresses[idx]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <Select
        onChange={handleChange}
        value=""
        className="text-sm"
      >
        <option value="">
          {isLoading ? 'Loading...' : 'Use a previous address'}
        </option>
        {addresses.map((addr, i) => (
          <option key={i} value={i}>
            {addr.projectAddress}, {addr.city}{addr.state ? `, ${addr.state}` : ''}
          </option>
        ))}
      </Select>
    </div>
  );
}
