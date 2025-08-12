'use client';

// Telemetry configuration - replace with actual keys in production
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Sentry error tracking
export const initSentry = () => {
  if (typeof window === 'undefined' || !SENTRY_DSN) return;
  
  console.log('Sentry initialized (stub)');
  // In production, initialize Sentry here:
  // Sentry.init({ dsn: SENTRY_DSN });
};

export const captureError = (error: Error, context?: Record<string, any>) => {
  console.error('Error captured:', error, context);
  // In production, send to Sentry:
  // Sentry.captureException(error, { extra: context });
};

// PostHog analytics
export const initPostHog = () => {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  
  console.log('PostHog initialized (stub)');
  // In production, initialize PostHog here:
  // posthog.init(POSTHOG_KEY, { api_host: 'https://app.posthog.com' });
};

// Privacy-safe event tracking
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
}

export const trackEvent = (event: AnalyticsEvent) => {
  console.log('Event tracked:', event);
  // In production, send to PostHog:
  // posthog.capture(event.event, event.properties);
};

// Common events for the chatbot
export const ChatEvents = {
  LANGUAGE_SELECTED: 'chat_language_selected',
  INTENT_CLICKED: 'chat_intent_clicked',
  MESSAGE_SENT: 'chat_message_sent',
  ACTION_CLICKED: 'chat_action_clicked',
  SESSION_STARTED: 'chat_session_started',
  ERROR_OCCURRED: 'chat_error_occurred',
} as const;

// Helper function to track chat events
export const trackChatEvent = (
  event: keyof typeof ChatEvents,
  properties: Record<string, string | number | boolean> = {}
) => {
  trackEvent({
    event: ChatEvents[event],
    properties: {
      timestamp: Date.now(),
      ...properties,
    },
  });
};
