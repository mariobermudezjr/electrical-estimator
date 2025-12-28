'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { TemplateManager } from '@/components/templates/TemplateManager';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { settings, updateSettings, fetchSettings, isLoading } = useSettingsStore();
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'templates'>('general');

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update form data when settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      alert('Failed to save settings. Please try again.');
      console.error('Save settings error:', error);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
            <p className="text-text-secondary">
              Configure your company information and default values
            </p>
          </div>
          {activeTab === 'general' && (
            <Button onClick={handleSave} disabled={saved}>
              <Save className="w-4 h-4 mr-2" />
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-border-primary">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'px-4 py-2 font-medium transition-colors',
              activeTab === 'general'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'px-4 py-2 font-medium transition-colors',
              activeTab === 'templates'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Scope Templates
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                This information will appear on your estimates and quotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="e.g., ABC Electrical Services"
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail || ''}
                    onChange={(e) => handleChange('companyEmail', e.target.value)}
                    placeholder="contact@example.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={formData.companyPhone || ''}
                    onChange={(e) => handleChange('companyPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="companyAddress">Address</Label>
                <Input
                  id="companyAddress"
                  value={formData.companyAddress || ''}
                  onChange={(e) => handleChange('companyAddress', e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Default Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Default Pricing</CardTitle>
              <CardDescription>
                These values will pre-fill when creating new estimates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultHourlyRate">Hourly Labor Rate ($)</Label>
                  <Input
                    id="defaultHourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.defaultHourlyRate}
                    onChange={(e) => handleChange('defaultHourlyRate', parseFloat(e.target.value))}
                    placeholder="75.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultMarkupPercentage">Markup Percentage (%)</Label>
                  <Input
                    id="defaultMarkupPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.defaultMarkupPercentage}
                    onChange={(e) => handleChange('defaultMarkupPercentage', parseFloat(e.target.value))}
                    placeholder="20"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>AI Pricing Research</CardTitle>
              <CardDescription>
                Configure AI provider for automated pricing research
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aiProvider">AI Provider</Label>
                <Select
                  id="aiProvider"
                  value={formData.preferredAIProvider}
                  onChange={(e) => handleChange('preferredAIProvider', e.target.value)}
                  className="mt-1.5"
                >
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary">
                  <strong className="text-text-primary">Server-Side API Keys:</strong> AI API keys are now
                  stored securely on the server as environment variables. All users share the same API keys configured
                  by the administrator. This is more secure and prevents exposure of API keys in the browser.
                  <br /><br />
                  Your selection above determines which AI provider will be used for pricing research when you request it.
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager />
        )}
      </div>
    </div>
  );
}
