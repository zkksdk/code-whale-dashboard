import { useStore } from '../store';
import { zh, en, type LocaleKey } from './index';

export function useTranslation() {
  const language = useStore((s) => s.language);
  const locale = language === 'zh' ? zh : en;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = locale;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    let result = typeof value === 'string' ? value : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
    }
    return result;
  };

  return { t, language };
}
