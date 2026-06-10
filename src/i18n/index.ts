import az, { TranslationKeys } from './az';
import ru from './ru';
import { useAppStore } from '../store/useAppStore';

export type { Lang } from '../types';

const translations = { az, ru } as const;

export function useT() {
  const lang = useAppStore.getState().lang;
  const t = (key: TranslationKeys): string =>
    (translations[lang] as Record<string, string>)[key]
    ?? (translations.az as Record<string, string>)[key]
    ?? key;
  return { t, lang };
}

export { az, ru };
export type { TranslationKeys };