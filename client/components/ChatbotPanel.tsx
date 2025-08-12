'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Virtuoso } from 'react-virtuoso';
import { Card } from '@/components/ui/card';
import { DisclaimerBar } from '@/components/DisclaimerBar';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatComposer } from '@/components/ChatComposer';
import { QuickChips } from '@/components/QuickChips';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useSessionStore } from '@/lib/store/session';
import { generateId } from '@/lib/utils';
import { ChatTurn, UserMessage, BotMessage, IntentKey, SupportedLocale } from '@/types/chat';

interface ChatbotPanelProps {
  isOpen?: boolean;
}

export function ChatbotPanel({ isOpen = true }: ChatbotPanelProps) {
  const t = useTranslations('chat');
  const { sessionId, locale } = useSessionStore();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);
  const virtuosoRef = useRef<any>(null);

  // Initialize chat with welcome messages
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessages: BotMessage[] = [
        {
          id: generateId(),
          role: 'assistant',
          content: t('welcome'),
          timestamp: new Date(),
        },
        {
          id: generateId(),
          role: 'system',
          content: t('disclaimer'),
          timestamp: new Date(),
        },
        {
          id: generateId(),
          role: 'assistant',
          content: t('chooseLanguage'),
          timestamp: new Date(),
        },
      ];
      setMessages(welcomeMessages);
    }
  }, [t, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
    }
  }, [messages]);

  const handleLanguageSelect = async (selectedLocale: SupportedLocale) => {
    setShowLanguageSelection(false);
    
    // Update locale in store
    useSessionStore.getState().setLocale(selectedLocale);
    
    // Send locale to backend
    try {
      await fetch('/api/session/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, locale: selectedLocale }),
      });
    } catch (error) {
      console.error('Failed to set session locale:', error);
    }

    // Add confirmation message
    const confirmMessage: BotMessage = {
      id: generateId(),
      role: 'assistant',
      content: t('languageConfirm', { language: selectedLocale.toUpperCase() }),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, confirmMessage]);
    
    // Show quick intent chips
    setTimeout(() => {
      showQuickIntents();
    }, 500);
  };

  const showQuickIntents = () => {
    const quickIntents = [
      { key: 'screening' as IntentKey, label: t('quickIntents.screening') },
      { key: 'scheduling' as IntentKey, label: t('quickIntents.scheduling') },
      { key: 'costs' as IntentKey, label: t('quickIntents.costs') },
      { key: 'aya' as IntentKey, label: t('quickIntents.aya') },
      { key: 'wayfinding' as IntentKey, label: t('quickIntents.wayfinding') },
      { key: 'glossary' as IntentKey, label: t('quickIntents.glossary') },
    ];

    const chips = quickIntents.map(intent => ({
      id: intent.key,
      label: intent.label,
      onClick: () => handleQuickIntent(intent.key),
      variant: 'outline' as const,
    }));

    // Add quick intents message
    const quickIntentMessage: BotMessage = {
      id: generateId(),
      role: 'assistant',
      content: 'How can I help you today? Choose from these common topics:',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, quickIntentMessage]);
  };

  const handleQuickIntent = async (intent: IntentKey) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Locale': locale,
        },
        body: JSON.stringify({
          sessionId,
          intent,
          meta: { fromChip: true, locale },
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      if (data.messages) {
        setMessages(prev => [...prev, ...data.messages]);
      }
    } catch (error) {
      console.error('Failed to send intent:', error);
      // Add error message
      const errorMessage: BotMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or call us directly for assistance.',
        timestamp: new Date(),
        actions: [
          { type: 'call', label: 'Call Now', href: 'tel:+1-212-639-2000' },
        ],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserMessage = async (content: string) => {
    // Add user message
    const userMessage: UserMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Locale': locale,
        },
        body: JSON.stringify({
          sessionId,
          text: content,
          meta: { locale },
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      if (data.messages) {
        setMessages(prev => [...prev, ...data.messages]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: BotMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or call us directly for assistance.',
        timestamp: new Date(),
        actions: [
          { type: 'call', label: 'Call Now', href: 'tel:+1-212-639-2000' },
        ],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-4xl">
        <div className="flex h-[600px] flex-col">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">MSK Assistant</h2>
              <LanguageSwitcher variant="header" />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-4 pb-0">
            <DisclaimerBar />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <Virtuoso
              ref={virtuosoRef}
              data={messages}
              itemContent={(index, message) => (
                <div className="px-4 py-2" key={message.id}>
                  <MessageBubble message={message} />
                  
                  {/* Show language selection chips after choose language message */}
                  {showLanguageSelection && 
                   index === messages.length - 1 && 
                   message.role === 'assistant' && 
                   message.content.includes(t('chooseLanguage')) && (
                    <div className="mt-4">
                      <LanguageSwitcher 
                        variant="inline" 
                        onLanguageSelect={handleLanguageSelect}
                      />
                    </div>
                  )}
                </div>
              )}
              className="chat-scroll"
              style={{ height: '100%' }}
            />
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="px-4 py-2">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-primary/5 border border-primary/10 px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-current animate-pulse"></div>
                    <div className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>{t('typing')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Composer */}
          <ChatComposer
            onSubmit={handleUserMessage}
            disabled={isLoading || showLanguageSelection}
            placeholder={showLanguageSelection ? 'Please select a language first...' : undefined}
          />
        </div>
      </Card>
    </section>
  );
}
