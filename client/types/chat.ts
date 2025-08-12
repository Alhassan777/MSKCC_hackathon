export type ActionButton =
  | { type: 'call'; label: string; href: string }
  | { type: 'schedule'; label: string; href: string }
  | { type: 'resource'; label: string; href: string };

export type Citation = { 
  title: string; 
  url: string; 
};

export type BotMessage = {
  id: string;
  role: 'assistant' | 'system';
  content: string;
  actions?: ActionButton[];
  citations?: Citation[];
  timestamp?: Date;
};

export type UserMessage = { 
  id: string; 
  role: 'user'; 
  content: string; 
  timestamp?: Date;
};

export type ChatTurn = BotMessage | UserMessage;

export type IntentKey = 
  | 'screening' 
  | 'scheduling' 
  | 'costs' 
  | 'support' 
  | 'wayfinding' 
  | 'glossary' 
  | 'language_selection'
  | 'unknown';

export type SupportedLocale = 'en' | 'es' | 'ar' | 'zh' | 'pt';

export type TextDirection = 'ltr' | 'rtl';

export interface ChatRequest {
  sessionId: string;
  text?: string;
  intent?: IntentKey;
  meta?: { 
    fromChip?: boolean;
    locale?: SupportedLocale;
  };
}

export interface ChatResponse {
  messages: BotMessage[];
  intent?: IntentKey;
  elapsedMs: number;
}

export interface SessionLocaleRequest {
  sessionId: string;
  locale: SupportedLocale;
}

export interface SessionLocaleResponse {
  ok: boolean;
  locale: SupportedLocale;
  dir: TextDirection;
}

export interface QuickIntent {
  key: IntentKey;
  labelKey: string;
  icon?: string;
}

export interface LanguageOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  dir: TextDirection;
}
