import React, { useState, useEffect } from 'react';
import { Save, TestTube, RefreshCw, Key, Globe, Server, Sliders } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig, updateConfig, testConfig } from '../api/client';
import { useStore } from '../store';
import { useTranslation } from '../i18n/useTranslation';

export default function Config() {
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'deepseek' | 'nvidia' | 'ui'>('deepseek');
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({api_key: "", base_url: "", provider: "", model: "", max_tokens: 4096, temperature: 0.7, top_p: 1.0});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  useEffect(() => {
    if (configData?.data?.data) {
      const raw = configData.data.data;
      // Map flat TOML to tabbed structure for UI
      const config = {
        deepseek: raw,
        nvidia_nim: raw,
        ui: raw.ui || { theme: raw.theme || "dark", language: raw.language || "en" },
      };
      if (activeTab === 'deepseek') {
        setFormData({
          api_key: config.deepseek?.api_key || '',
          base_url: config.deepseek?.base_url || 'https://api.deepseek.com',
          provider: config.deepseek?.provider || 'deepseek',
          model: config.deepseek?.model || config.deepseek?.default_text_model || 'deepseek-chat',
          max_tokens: config.deepseek?.max_tokens || 4096,
          temperature: config.deepseek?.temperature || 0.7,
          top_p: config.deepseek?.top_p || 1.0,
        });
      } else if (activeTab === 'nvidia') {
        setFormData({
          api_key: config.nvidia_nim?.api_key || '',
          base_url: config.nvidia_nim?.base_url || 'https://integrate.api.nvidia.com/v1',
          model: config.nvidia_nim?.model || 'deepseek-ai/deepseek-r1',
          max_tokens: config.nvidia_nim?.max_tokens || 4096,
          temperature: config.nvidia_nim?.temperature || 0.7,
        });
      } else {
        setFormData({
          theme: config.ui?.theme || 'dark',
          language: config.ui?.language || 'en',
          show_cost: config.ui?.show_cost !== false,
          auto_scroll: config.ui?.auto_scroll !== false,
        });
      }
    }
  }, [configData, activeTab]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      addToast({ type: 'success', message: t('config.saveSuccess') });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: `${'Failed to save'}: ${err.message}` });
    },
  });

  const testMutation = useMutation({
    mutationFn: testConfig,
    onSuccess: (res) => {
      setTestResult({ success: true, message: t('config.connectionSuccess') });
      addToast({ type: 'success', message: t('config.apiTestPassed') });
    },
    onError: (err: Error) => {
      setTestResult({ success: false, message: err.message });
      addToast({ type: 'error', message: `${'Connection test failed'}: ${err.message}` });
    },
  });

  const handleSave = () => {
    const raw = configData?.data?.data || {};
    if (activeTab === 'deepseek') {
      Object.assign(raw, formData);
    } else if (activeTab === 'nvidia') {
      Object.assign(raw, formData);
    } else {
      Object.assign(raw, formData);
    }
    updateMutation.mutate(raw);
  };

  const tabs = [
    { id: 'deepseek' as const, label: t('config.deepseek'), icon: <Server size={16} /> },
    { id: 'nvidia' as const, label: 'NVIDIA NIM', icon: <Globe size={16} /> },
    { id: 'ui' as const, label: 'UI Settings', icon: <Sliders size={16} /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">{t('config.title')}</h1>
        <p className="text-gray-500 mt-1">{t('config.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-whale-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 space-y-5">
        {activeTab === 'deepseek' && (
          <>
            <FormField
              label="API Key"
              icon={<Key size={16} />}
              type="password"
              value={formData.api_key as string}
              onChange={(v) => setFormData({ ...formData, api_key: v })}
              placeholder="sk-..."
            />
            <FormField
              label="Base URL"
              icon={<Globe size={16} />}
              value={formData.base_url as string}
              onChange={(v) => setFormData({ ...formData, base_url: v })}
            />
            <FormField
              label="Provider"
              icon={<Server size={16} />}
              value={formData.provider as string}
              onChange={(v) => setFormData({ ...formData, provider: v })}
            />
            <FormField
              label="Default Model"
              value={formData.model as string}
              onChange={(v) => setFormData({ ...formData, model: v })}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Max Tokens"
                type="number"
                value={formData.max_tokens as number}
                onChange={(v) => setFormData({ ...formData, max_tokens: Number(v) })}
              />
              <FormField
                label="Temperature"
                type="number"
                value={formData.temperature as number}
                onChange={(v) => setFormData({ ...formData, temperature: Number(v) })}
                step="0.1"
                min="0"
                max="2"
              />
              <FormField
                label="Top P"
                type="number"
                value={formData.top_p as number}
                onChange={(v) => setFormData({ ...formData, top_p: Number(v) })}
                step="0.1"
                min="0"
                max="1"
              />
            </div>
          </>
        )}

        {activeTab === 'nvidia' && (
          <>
            <FormField
              label="API Key"
              icon={<Key size={16} />}
              type="password"
              value={formData.api_key as string}
              onChange={(v) => setFormData({ ...formData, api_key: v })}
              placeholder="nvapi-..."
            />
            <FormField
              label="Base URL"
              icon={<Globe size={16} />}
              value={formData.base_url as string}
              onChange={(v) => setFormData({ ...formData, base_url: v })}
            />
            <FormField
              label="Model"
              value={formData.model as string}
              onChange={(v) => setFormData({ ...formData, model: v })}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Max Tokens"
                type="number"
                value={formData.max_tokens as number}
                onChange={(v) => setFormData({ ...formData, max_tokens: Number(v) })}
              />
              <FormField
                label="Temperature"
                type="number"
                value={formData.temperature as number}
                onChange={(v) => setFormData({ ...formData, temperature: Number(v) })}
                step="0.1"
                min="0"
                max="2"
              />
            </div>
          </>
        )}

        {activeTab === 'ui' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('config.themeLabel')}</label>
              <select
                value={formData.theme as string}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-whale-500"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('settings.language')}</label>
              <select
                value={formData.language as string}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-whale-500"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300">{t('config.showCost')}</span>
              <Toggle
                checked={formData.show_cost as boolean}
                onChange={(v) => setFormData({ ...formData, show_cost: v })}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300">{t('config.autoScroll')}</span>
              <Toggle
                checked={formData.auto_scroll as boolean}
                onChange={(v) => setFormData({ ...formData, auto_scroll: v })}
              />
            </div>
          </>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${
            testResult.success
              ? 'bg-green-900/30 text-green-400 border border-green-800'
              : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}>
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-whale-600 hover:bg-whale-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} />
            {updateMutation.isPending ? t('config.saving') : t('config.saveConfig')}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <TestTube size={16} />
            {testMutation.isPending ? t('config.testing') : t('config.testConnection')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  icon?: React.ReactNode;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className={`w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-whale-500 focus:ring-1 focus:ring-whale-500 ${
            icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-whale-600' : 'bg-dark-600'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}