import React, { useState } from 'react';
import { Moon, Sun, Globe, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/client';
import { useStore } from '../store';
import { useTranslation } from '../i18n/useTranslation';

export default function Settings() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme, language, setLanguage, addToast } = useStore();
  const { t } = useTranslation();
  const [autoSave, setAutoSave] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      addToast({ type: 'success', message: 'Settings saved' });
    },
  });

  const handleClearData = () => {
    addToast({ type: 'warning', message: 'Data cleared (simulated)' });
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">{t('settings.title')}</h1>
        <p className="text-gray-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Appearance */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('settings.appearance')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <div>
                <p className="text-sm font-medium text-gray-200">{t('settings.theme')}</p>
                <p className="text-xs text-gray-500">{t('settings.themeDesc')}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-whale-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              >
                {theme === 'dark' ? <Moon size={12} className="text-gray-700" /> : <Sun size={12} className="text-gray-700" />}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={20} />
              <div>
                <p className="text-sm font-medium text-gray-200">{t('settings.language')}</p>
                <p className="text-xs text-gray-500">{t('settings.languageDesc')}</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
              className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('settings.behavior')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('settings.autoSave')}</p>
              <p className="text-xs text-gray-500">{t('settings.autoSaveDesc')}</p>
            </div>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                autoSave ? 'bg-whale-600' : 'bg-dark-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                autoSave ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('settings.dataManagement')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-gray-200">{t('settings.databaseSize')}</p>
                <p className="text-xs text-gray-500">~12.4 MB</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded-lg text-sm text-red-400 transition-colors"
          >
            <Trash2 size={16} />
            {t('settings.clearAllData')}
          </button>
        </div>
      </div>

      {/* Clear data confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setShowClearConfirm(false)}>
          <div
            className="bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h3 className="text-lg font-semibold text-gray-100">{t('settings.clearConfirm')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              {t('settings.clearWarning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearData}
                className="flex-1 bg-red-600 hover:bg-red-500 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {t('settings.confirm')}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-dark-700 hover:bg-dark-600 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}