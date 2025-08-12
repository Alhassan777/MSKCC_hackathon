'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Virtuoso } from 'react-virtuoso';
import { Send, Menu, Plus, MessageSquare, Globe, Phone, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageBubble } from '@/components/MessageBubble';
import { useSessionStore } from '@/lib/store/session';
import { generateId, formatTime } from '@/lib/utils';
import { ChatTurn, UserMessage, BotMessage, IntentKey, SupportedLocale } from '@/types/chat';
import { languageOptions } from '@/lib/i18n/config';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ChatTurn[];
}

export function ChatInterface() {
  const t = useTranslations('chat');
  const { sessionId, locale } = useSessionStore();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLocale>('en');
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [showPIIBanner, setShowPIIBanner] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const virtuosoRef = useRef<any>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with browser locale
  useEffect(() => {
    const browserLocale = navigator.language.split('-')[0] as SupportedLocale;
    const supportedLocale = languageOptions.find(lang => lang.code === browserLocale)?.code || 'en';
    setSelectedLanguage(supportedLocale);
    if (supportedLocale !== locale) {
      useSessionStore.getState().setLocale(supportedLocale);
    }
  }, [locale]);

  // Initialize session
  useEffect(() => {
    if (!currentSessionId) {
      const newSessionId = generateId();
      setCurrentSessionId(newSessionId);
      
      const initialSession: ChatSession = {
        id: newSessionId,
        title: 'Start New Conversation',
        lastMessage: '',
        timestamp: new Date(),
        messages: [],
      };
      
      setChatSessions([initialSession]);
    }
  }, [currentSessionId]);

  // Auto-scroll messages
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ 
          index: messages.length - 1, 
          behavior: 'smooth',
          align: 'end'
        });
      }, 100);
    }
  }, [messages]);

  // Update session in sidebar
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages,
              lastMessage: messages[messages.length - 1]?.content.slice(0, 50) + '...' || '',
              timestamp: new Date(),
              title: session.title === 'Start New Conversation' && messages.find(m => m.role === 'user')
                ? messages.find(m => m.role === 'user')?.content.slice(0, 30) + '...' || 'New Chat'
                : session.title
            }
          : session
      ));
    }
  }, [messages, currentSessionId]);

  // Show toast for language changes
  const showLanguageToast = (language: string) => {
    setShowToast(`Language: ${language}`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const createNewChat = () => {
    const newSessionId = generateId();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setShowWelcomeCard(true);
    setInput('');
    
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const switchToSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowWelcomeCard(session.messages.length === 0);
    
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLanguageSelect = async (newLocale: SupportedLocale) => {
    setSelectedLanguage(newLocale);
    useSessionStore.getState().setLocale(newLocale);
    
    const languageName = languageOptions.find(lang => lang.code === newLocale)?.nativeName || newLocale;
    showLanguageToast(languageName);
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/session/locale?session_id=${sessionId}&locale=${newLocale}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Failed to set session locale:', error);
    }
  };

  const handleWelcomeAction = async (action: 'language', value: string) => {
    if (action === 'language') {
      await handleLanguageSelect(value as SupportedLocale);
      
      // Collapse welcome card and show localized welcome message
      setShowWelcomeCard(false);
      setIsLoading(true);
      
      setTimeout(() => {
        setIsLoading(false);
        
        // Get the welcome message in the selected language
        const welcomeMessage = getLocalizedWelcomeMessage(value as SupportedLocale);
        
        const assistantMessage: BotMessage = {
          id: generateId(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        };
        setMessages([assistantMessage]);
      }, 800);
    }
  };

  // Helper function to get localized welcome message
  const getLocalizedWelcomeMessage = (locale: SupportedLocale) => {
    const welcomeMessages = {
      en: "Hi there — welcome to MSK Assistant.\n\nNot sure where to start? That's okay — we can figure it out together. I can walk you through screenings, appointments, costs, or finding support. No medical jargon, just simple answers and clear steps so you feel confident about what comes next.\n\nAnd don't worry — we don't keep or use any personal information you share here.",
      es: "Hola — bienvenido al Asistente MSK.\n\n¿No está seguro por dónde empezar? Está bien — podemos descubrirlo juntos. Puedo guiarle a través de exámenes, citas, costos o encontrar apoyo. Sin jerga médica, solo respuestas simples y pasos claros para que se sienta confiado sobre lo que viene después.\n\nY no se preocupe — no guardamos ni usamos ninguna información personal que comparta aquí.",
      ar: "مرحباً — أهلاً بك في مساعد MSK.\n\nلست متأكداً من أين تبدأ؟ لا بأس — يمكننا اكتشاف ذلك معاً. يمكنني إرشادك خلال الفحوصات والمواعيد والتكاليف أو إيجاد الدعم. لا مصطلحات طبية معقدة، فقط إجابات بسيطة وخطوات واضحة لتشعر بالثقة حول ما سيأتي بعد ذلك.\n\nولا تقلق — نحن لا نحتفظ أو نستخدم أي معلومات شخصية تشاركها هنا.",
      zh: "您好 — 欢迎使用MSK助手。\n\n不知道从哪里开始？没关系 — 我们可以一起弄清楚。我可以引导您了解筛查、预约、费用或寻找支持。没有医学术语，只有简单的答案和清晰的步骤，让您对接下来的事情充满信心。\n\n不用担心 — 我们不会保存或使用您在这里分享的任何个人信息。",
      pt: "Olá — bem-vindo ao Assistente MSK.\n\nNão tem certeza por onde começar? Tudo bem — podemos descobrir juntos. Posso orientá-lo sobre exames, consultas, custos ou encontrar apoio. Sem jargão médico, apenas respostas simples e passos claros para que você se sinta confiante sobre o que vem a seguir.\n\nE não se preocupe — não guardamos nem usamos nenhuma informação pessoal que você compartilhar aqui."
    };
    
    return welcomeMessages[locale] || welcomeMessages.en;
  };

  const handleQuickIntent = async (intent: IntentKey) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: `Intent: ${intent}`,
          language: selectedLanguage,
          intent: intent,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Add the assistant response
      if (data.message) {
        const assistantMessage: BotMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions || [],
          citations: data.citations || [],
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send intent:', error);
      const errorMessage: BotMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or call us directly.',
        timestamp: new Date(),
        actions: [
          { type: 'call', label: 'Call MSK Now', href: 'tel:+1-212-639-2000' },
        ],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check for PII
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    
    if (emailRegex.test(input) || phoneRegex.test(input)) {
      setShowPIIBanner(true);
      setTimeout(() => setShowPIIBanner(false), 8000);
    }

    const userMessage: UserMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: input.trim(),
          language: selectedLanguage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Add the assistant response
      if (data.message) {
        const assistantMessage: BotMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions || [],
          citations: data.citations || [],
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: BotMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or call us directly.',
        timestamp: new Date(),
        actions: [
          { type: 'call', label: 'Call MSK Now', href: 'tel:+1-212-639-2000' },
        ],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickIntents = [
    { key: 'screening' as IntentKey, label: 'Screening' },
    { key: 'scheduling' as IntentKey, label: 'Scheduling' },
    { key: 'costs' as IntentKey, label: 'Costs' },
    { key: 'aya' as IntentKey, label: 'AYA Support' },
    { key: 'wayfinding' as IntentKey, label: 'Wayfinding' },
    { key: 'glossary' as IntentKey, label: 'Glossary' },
  ];

  const currentLanguageName = languageOptions.find(lang => lang.code === selectedLanguage)?.nativeName || 'English';

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-md">
          ✓ {showToast}
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen && !isMobile ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <Button
              onClick={createNewChat}
              className="w-full justify-start gap-2 bg-[#002569] text-white hover:bg-[#143983]"
            >
              <Plus className="h-4 w-4" />
              Start New Conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => switchToSession(session)}
                  className={`group w-full text-left p-3 rounded-xl mb-1 hover:bg-gray-50 transition-colors ${
                    session.id === currentSessionId ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </div>
                      {session.lastMessage && (
                        <div className="text-xs text-gray-500 truncate">
                          {session.lastMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-[#002569] flex items-center justify-center text-white text-sm font-semibold">
              MSK
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">MSK Assistant</h1>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Info-only
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!showWelcomeCard && (
              <div className="text-sm text-gray-600 mr-2">
                Language: {currentLanguageName} · <button onClick={() => setShowWelcomeCard(true)} className="text-[#002569] hover:underline">Change</button>
              </div>
            )}
            <a 
              href="#emergency" 
              className="text-sm text-red-600 hover:text-red-800 underline mr-2"
            >
              Emergency?
            </a>
            <Button
              variant="default"
              size="sm"
              asChild
              className="bg-[#002569] hover:bg-[#143983] text-white focus:ring-2 focus:ring-[#002569] focus:ring-offset-2"
              title="Call Memorial Sloan Kettering: +1-212-639-2000"
            >
              <a href="tel:+1-212-639-2000" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call MSK Now
              </a>
            </Button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-[#FEF3C7] border-b border-[#F59E0B] px-4 py-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#92400E] flex-shrink-0" />
          <span className="text-sm text-[#92400E]">
            Information only. For medical advice or emergencies, call 911 or your care team.
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 max-w-4xl mx-auto w-full">
          {/* Welcome Card */}
          {showWelcomeCard && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">MSK Assistant</h2>
                <p className="text-gray-600 mb-6">Helping you find the right care and resources, while keeping your privacy first.</p>
                
                {/* Language Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Choose your language:</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {languageOptions.map((language) => (
                      <Button
                        key={language.code}
                        variant={language.code === selectedLanguage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleWelcomeAction('language', language.code)}
                        className={`${language.code === selectedLanguage ? 'bg-[#002569] text-white' : ''} focus:ring-2 focus:ring-[#002569] focus:ring-offset-2`}
                      >
                        {language.nativeName}
                      </Button>
                    ))}
                  </div>
                </div>



                <button 
                  onClick={() => setShowWelcomeCard(false)}
                  className="text-sm text-[#002569] hover:underline"
                >
                  Prefer to type instead?
                </button>
              </div>
            </div>
          )}

          {/* Chat Card */}
          {!showWelcomeCard && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 flex flex-col h-[600px] overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                {messages.length > 0 && (
                  <Virtuoso
                    ref={virtuosoRef}
                    data={messages}
                    itemContent={(index, message) => (
                      <div className="px-6 py-2" key={message.id}>
                        <MessageBubble message={message} />
                      </div>
                    )}
                    className="h-full"
                    followOutput="smooth"
                    aria-live="polite"
                    aria-label="Chat messages"
                  />
                )}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="px-6 py-2">
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-[#002569] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-1">
                        MSK
                      </div>
                      <div className="rounded-2xl bg-[#002569]/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="h-1 w-1 rounded-full bg-current animate-pulse"></div>
                          <div className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          <span>MSK Assistant is typing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Intents Row */}
              {!showWelcomeCard && messages.length > 0 && (
                <div className="px-6 py-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {quickIntents.map((intent) => (
                      <Button
                        key={intent.key}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickIntent(intent.key)}
                        className="text-xs border-gray-300 hover:border-[#002569] hover:text-[#002569] focus:ring-2 focus:ring-[#002569] focus:ring-offset-2"
                      >
                        {intent.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* PII Banner */}
              {showPIIBanner && (
                <div className="mx-6 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      For your privacy, don't share phone or email here. You can call instead.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    >
                      <a href="tel:+1-212-639-2000">Call now</a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPIIBanner(false)}
                      className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white p-4 rounded-b-2xl">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about screening, costs, support…"
                      disabled={isLoading}
                      className="pr-12 py-3 text-base border-gray-300 focus:border-[#002569] focus:ring-[#002569] focus:ring-2 focus:ring-offset-2 rounded-xl"
                      autoComplete="off"
                      aria-label="Type your message"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#002569] disabled:opacity-50 focus:ring-2 focus:ring-[#002569] focus:ring-offset-2"
                      aria-label="Send message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-gray-500 text-center mt-2">
                  MSK Assistant can make mistakes. Please verify important information.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile sticky CTA */}
        {isMobile && (
          <div className="safe-area-bottom bg-white border-t border-gray-200 p-4">
            <Button
              asChild
              className="w-full bg-[#002569] hover:bg-[#143983] text-white"
            >
              <a href="tel:+1-212-639-2000" className="flex items-center justify-center gap-2">
                <Phone className="h-5 w-5" />
                Call MSK Now
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}