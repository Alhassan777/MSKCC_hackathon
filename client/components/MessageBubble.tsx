'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Phone, Calendar, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { ChatTurn, ActionButton } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatTurn;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, showTimestamp = false }: MessageBubbleProps) {
  const t = useTranslations('actions');

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
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              className="prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0"
            >
              {message.content}
            </ReactMarkdown>
            
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
