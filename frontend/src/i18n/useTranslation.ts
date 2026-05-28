import { useStore } from '../store';
import { zh, en, type LocaleKey } from './index';

export function useTranslation() {
  const language = useStore((s) => s.language);
  const locale = language === 'zh' ? zh : en;

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = locale;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  return { t, language };
}
