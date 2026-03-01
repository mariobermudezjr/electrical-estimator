'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/clients/${params.id}`);
        if (!response.ok) throw new Error('Client not found');
        const { data } = await response.json();
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
      } catch (err) {
        alert('Failed to load client');
        router.push('/clients');
      } finally {
        setIsLoading(false);
      }
    };
    fetchClient();
  }, [params.id, router]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a client name');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update client');
      router.push(`/clients/${params.id}`);
    } catch (error) {
      alert('Failed to update client. Please try again.');
      console.error('Update client error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/clients/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Edit Client</h1>
            <p className="text-text-secondary">Update client information</p>
          </div>
          <Button onClick={handleSave} size="lg" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Update the client's contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
