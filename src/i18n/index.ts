import az, { TranslationKeys } from './az';
import ru from './ru';
import { useAppStore } from '../store/useAppStore';
// Re-export Lang from types.ts — single source of truth, no duplication
export type { Lang } from '../types';

const translations = { az, ru };

export function useT() {
  const lang = useAppStore(s => s.lang);
  return {
    t: (key: TranslationKeys): string => {
      return (translations[lang] as Record<string, string>)[key]
          ?? (translations.az  as Record<string, string>)[key]
          ?? key;
    },
    lang,
  };
}

export { az, ru };
export type { TranslationKeys };
