import { SupportedLocale, LanguageOption } from '@/types/chat';

export const defaultLocale: SupportedLocale = 'en';

export const locales: SupportedLocale[] = ['en', 'es', 'ar', 'zh', 'pt'];

export const languageOptions: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
];

export function getLanguageOption(locale: SupportedLocale): LanguageOption {
  return languageOptions.find(option => option.code === locale) || languageOptions[0];
}

export function getTextDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return getLanguageOption(locale).dir;
}
