export type ActionButton =
  | { type: 'call'; label: string; href: string }
  | { type: 'schedule'; label: string; href: string }
  | { type: 'resource'; label: string; href: string };

export type Citation = { 
  title: string; 
  url: string; 
};

export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
  score?: number;
};

export interface PIIDetectionResult {
  has_pii: boolean;
  detected_types: string[];
  redaction_notice?: string;
  confidence: number;
  original_length: number;
  sanitized_length: number;
}

export type BotMessage = {
  id: string;
  role: 'assistant' | 'system';
  content: string;
  actions?: ActionButton[];
  citations?: Citation[];
  search_sources?: SearchSource[];
  pii_detection?: PIIDetectionResult;
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
  | 'getting_started' 
  | 'screening_prevention' 
  | 'scheduling_appointments' 
  | 'financial_insurance' 
  | 'supportive_care' 
  | 'aya_caregiver' 
  | 'navigation_logistics' 
  | 'glossary_education' 
  | 'clinical_trials'
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
