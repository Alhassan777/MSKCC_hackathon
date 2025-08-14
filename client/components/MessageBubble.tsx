'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Phone, Calendar, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { ChatTurn, ActionButton, PIIDetectionResult, SearchSource } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatTurn;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, showTimestamp = false }: MessageBubbleProps) {
  const t = useTranslations('actions');

  const renderPIINotice = (piiDetection: PIIDetectionResult) => {
    if (!piiDetection.has_pii || !piiDetection.redaction_notice) return null;

    return (
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-5 h-5 mt-0.5">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-yellow-800 font-medium mb-1">Privacy Protection Notice</p>
            <p className="text-sm text-yellow-700">{piiDetection.redaction_notice}</p>
            <p className="text-xs text-yellow-600 mt-1">Your privacy is protected - no personal information is stored.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = (actions: ActionButton[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => {
          const getIcon = () => {
            switch (action.type) {
              case 'call':
                return <Phone className="h-4 w-4" />;
              case 'schedule':
                return <Calendar className="h-4 w-4" />;
              case 'resource':
                return <FileText className="h-4 w-4" />;
              default:
                return <ExternalLink className="h-4 w-4" />;
            }
          };

          const isPrimary = action.type === 'call';

          return (
            <Button
              key={index}
              variant={isPrimary ? 'default' : 'outline'}
              size="sm"
              className={`flex items-center gap-2 h-9 text-sm font-medium focus:ring-2 focus:ring-offset-2 ${
                isPrimary 
                  ? 'bg-[#002569] hover:bg-[#143983] text-white focus:ring-[#002569]' 
                  : 'border-gray-300 hover:border-[#002569] hover:text-[#002569] focus:ring-[#002569]'
              }`}
              asChild
            >
              <a
                href={action.href}
                target={action.type === 'schedule' || action.type === 'resource' ? '_blank' : undefined}
                rel={action.type === 'schedule' || action.type === 'resource' ? 'noopener noreferrer' : undefined}
                aria-label={`${action.label} - ${action.type === 'call' ? 'Call MSK' : action.type === 'schedule' ? 'Schedule appointment' : 'Open resource'}`}
              >
                {getIcon()}
                {action.label}
              </a>
            </Button>
          );
        })}
      </div>
    );
  };

  const renderSearchSources = () => {
    if (message.role === 'user' || !('search_sources' in message) || !message.search_sources?.length) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 text-blue-600">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-medium text-blue-800">Sources from web search:</span>
        </div>
        <div className="space-y-2">
          {message.search_sources.map((source, index) => (
            <div key={index} className="bg-white p-2 rounded border border-blue-100">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-blue-25 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-900 hover:text-blue-700 line-clamp-1">
                      {source.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {source.snippet}
                    </div>
                    <div className="text-xs text-blue-600 mt-1 truncate">
                      {new URL(source.url).hostname}
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-blue-500 flex-shrink-0 mt-1" />
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCitations = () => {
    if (message.role === 'user' || !('citations' in message) || !message.citations?.length) {
      return null;
    }

    return (
      <div className="mt-2 space-y-1">
        {message.citations.map((citation, index) => (
          <div key={index} className="text-xs text-gray-500">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#002569] underline inline-flex items-center gap-1 focus:ring-2 focus:ring-[#002569] focus:ring-offset-2 rounded"
            >
              Source: {citation.title}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    );
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-3 group">
        <div className="max-w-[68ch] rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
          <div className="text-sm leading-relaxed text-gray-900">
            {message.content}
          </div>
          {message.timestamp && (
            <div className="mt-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {formatTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant or system message
  const isSystemMessage = message.role === 'system';
  
  return (
    <div className="flex justify-start mb-3 group">
      <div className="flex items-start gap-3 max-w-[72ch]">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#002569] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-1">
          MSK
        </div>
        
        {/* Message Content */}
        <div className={`rounded-2xl px-4 py-3 ${
          isSystemMessage 
            ? 'bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E]' 
            : 'bg-[#002569]/5 text-gray-900'
        }`}>
          <div className="text-sm space-y-3 leading-relaxed">
            {/* PII Detection Notice */}
            {message.role === 'assistant' && 'pii_detection' in message && message.pii_detection && 
              renderPIINotice(message.pii_detection)
            }
            
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0"
            >
              {message.content}
            </ReactMarkdown>
            
            {renderSearchSources()}
            
            {renderCitations()}
            
            {'actions' in message && message.actions && renderActionButtons(message.actions)}
          </div>
          
          {message.timestamp && (
            <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {formatTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
