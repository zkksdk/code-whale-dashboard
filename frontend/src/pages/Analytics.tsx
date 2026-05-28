import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Zap, Calendar, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getCostBreakdown } from '../api/client';
import { formatCost, formatTokenCount } from '../utils/format';
import { useTranslation } from '../i18n/useTranslation';

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(30);

  const { data: analytics } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => getAnalytics({ days: period }),
  });

  const { data: costData } = useQuery({
    queryKey: ['costs', period],
    queryFn: () => getCostBreakdown({ days: period }),
  });

  // Sample chart data (would come from real API)
  const a = analytics?.data?.data;
  const dailyData = (a?.daily || a?.usage?.buckets || []).map((b: any) => ({
    date: b.date || b.key,
    tokens: (b.prompt_tokens || b.input_tokens || 0) + (b.completion_tokens || b.output_tokens || 0),
    cost: b.cost || b.cost_usd || 0,
  }));
  const modelData = (a?.byModel || []).map((b: any) => ({
    name: b.model || b.key,
    tokens: (b.prompt_tokens || b.input_tokens || 0) + (b.completion_tokens || b.output_tokens || 0),
    cost: b.cost || b.cost_usd || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{t('analytics.title')}</h1>
          <p className="text-gray-500 mt-1">{t("analytics.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === d
                  ? 'bg-whale-600 text-white'
                  : 'bg-dark-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-green-400" />
            <span className="text-xs text-gray-500">{t('analytics.totalCost')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{formatCost(analytics?.data?.data?.totalCost || 0)}</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-yellow-400" />
            <span className="text-xs text-gray-500">{t('analytics.totalTokens')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{formatTokenCount(analytics?.data?.data?.totalTokens || 0)}</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-blue-400" />
            <span className="text-xs text-gray-500">{t('analytics.avgCostPerDay')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {formatCost((analytics?.data?.data?.totalCost || 0) / period)}
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={18} className="text-purple-400" />
            <span className="text-xs text-gray-500">{t('analytics.sessions')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{analytics?.data?.data?.sessionCount || 0}</p>
        </div>
      </div>

      {/* Token usage chart */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('analytics.dailyTokenUsage')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0c8ee9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0c8ee9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis dataKey="date" stroke="#718096" fontSize={12} />
            <YAxis stroke="#718096" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a202c',
                border: '1px solid #4a5568',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke="#0c8ee9"
              fill="url(#tokenGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cost chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('analytics.dailyCost')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" stroke="#718096" fontSize={12} />
              <YAxis stroke="#718096" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a202c',
                  border: '1px solid #4a5568',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="cost" fill="#48bb78" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('analytics.costByModel')}</h3>
          <div className="space-y-3">
            <CostRow model="DeepSeek Chat" tokens={45000} cost={0.0189} color="bg-blue-500" />
            <CostRow model="DeepSeek Reasoner" tokens={12000} cost={0.0329} color="bg-purple-500" />
            <CostRow model="DeepSeek R1 (NIM)" tokens={8000} cost={0.015} color="bg-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({ model, tokens, cost, color }: { model: string; tokens: number; cost: number; color: string }) {
  const maxTokens = 50000;
  const percent = (tokens / maxTokens) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{model}</span>
        <span className="text-gray-400 font-mono">{formatCost(cost)}</span>
      </div>
      <div className="w-full bg-dark-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{formatTokenCount(tokens)} tokens</p>
    </div>
  );
}