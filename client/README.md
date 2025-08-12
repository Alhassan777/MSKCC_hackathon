# MSK Young Adult Journey - Chatbot MVP

A production-quality, accessible, mobile-first web UI for the Memorial Sloan Kettering Young Adult Journey project with a multilingual AI chatbot MVP.

## 🌟 Features

- **Next.js 14** with App Router and TypeScript
- **Multilingual Support** - English, Spanish, Arabic, Chinese with RTL support
- **Accessible Design** - WCAG 2.1 AA compliant
- **MSK Branding** - Custom theme with MSK Navy (#002569)
- **Mobile-First** - Responsive design optimized for all devices
- **AI Chatbot** - Mock conversation flow with language selection
- **Safety Features** - PII detection, disclaimer messaging, crisis support
- **Modern Stack** - Tailwind CSS, shadcn/ui, Framer Motion, React Query

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   cd client
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your settings:
   ```env
   NEXT_PUBLIC_BOOKING_URL=https://your-booking-system.com
   # Optional telemetry
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
   ```

3. **Run development server**
   ```bash
   pnpm dev
   ```

4. **Open browser**
   Navigate to `http://localhost:3000`

## 🎯 Core User Flow

1. **Welcome**: User sees MSK branding and hero section
2. **Chat Initiation**: User clicks "Start Chat" 
3. **Language Selection**: Bot presents clickable language chips (EN, ES, AR, ZH)
4. **Locale Switch**: UI immediately switches language/direction, confirms choice
5. **Intent Selection**: Bot shows quick-action chips for common topics
6. **Conversation**: User can chat or select intents, receives contextual responses
7. **Actions**: Every response includes relevant action buttons (Call, Schedule, Resources)

## 🌍 Language Support

### Supported Locales
- **English (en)** - Default, LTR
- **Spanish (es)** - LTR  
- **Arabic (ar)** - RTL with Noto Naskh Arabic font
- **Chinese (zh)** - LTR

### RTL Implementation
- Automatic text direction switching
- Font family changes for Arabic
- Layout mirroring for chat bubbles and UI elements
- Proper ARIA attributes and semantic HTML

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_BOOKING_URL` | External booking system URL | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | No |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | No |

### Mock Data Customization

Edit `app/api/chat/route.ts` to modify:
- Intent recognition patterns
- Response content per locale
- Action buttons and citations
- Conversation flows

### Styling Customization

Key files for theming:
- `tailwind.config.js` - Theme tokens and colors
- `app/globals.css` - CSS variables and MSK theme
- `lib/i18n/config.ts` - Language settings

## 🏗️ Architecture

```
client/
├── app/                      # Next.js 14 App Router
│   ├── api/                  # API routes
│   │   ├── chat/             # Mock chat endpoint
│   │   └── session/locale/   # Locale management
│   ├── globals.css           # Global styles & theme
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── ChatbotPanel.tsx      # Main chat interface
│   ├── Header.tsx            # Site header
│   ├── LanguageSwitcher.tsx  # Locale switching
│   └── ...                   # Other components
├── lib/                      # Utilities and config
│   ├── i18n/                 # Internationalization
│   ├── store/                # Zustand state management
│   ├── telemetry.ts          # Analytics stubs
│   └── utils.ts              # Helper functions
├── messages/                 # Translation files
│   ├── en.json
│   ├── es.json
│   ├── ar.json
│   └── zh.json
└── types/                    # TypeScript definitions
    └── chat.ts
```

## 🛡️ Safety & Privacy

### PII Protection
- Client-side detection of emails, phones, addresses
- Non-blocking warnings with option to continue
- Server-side validation and filtering
- No PII storage or logging

### Crisis Support
- Prominent "Call Now" buttons throughout
- Emergency contact information
- Clear escalation paths to human support

### Content Safety
- Sanitized markdown rendering
- HTTPS-only external links
- Input validation and rate limiting

## ♿ Accessibility

### WCAG 2.1 AA Compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ High contrast focus indicators
- ✅ Semantic HTML structure
- ✅ ARIA live regions for chat
- ✅ Alternative text for images
- ✅ Proper heading hierarchy

### Testing
```bash
# Lighthouse accessibility audit
npm run lighthouse

# Keyboard-only testing
# Tab through entire interface
# All interactive elements should be reachable
```

## 📱 Mobile Optimization

- Mobile-first responsive design
- Touch-friendly button sizes (44px minimum)
- Optimized virtual keyboard handling
- Smooth scrolling and animations
- Performance optimized for 3G networks

## 🔄 API Contracts

### POST `/api/session/locale`
Set user's preferred language for the session.

**Request:**
```json
{
  "sessionId": "session_123",
  "locale": "es"
}
```

**Response:**
```json
{
  "ok": true,
  "locale": "es",
  "dir": "ltr"
}
```

### POST `/api/chat`
Send message or intent to chatbot.

**Request:**
```json
{
  "sessionId": "session_123",
  "text": "How do I schedule an appointment?",
  "intent": "scheduling",
  "meta": {
    "fromChip": true,
    "locale": "en"
  }
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "role": "assistant", 
      "content": "You can schedule online 24/7...",
      "actions": [
        {
          "type": "schedule",
          "label": "Schedule Online",
          "href": "https://mskcc.org/appointments"
        }
      ],
      "citations": [
        {
          "title": "Online Scheduling",
          "url": "https://mskcc.org/appointments"
        }
      ]
    }
  ],
  "intent": "scheduling",
  "elapsedMs": 1250
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Language switching works in header and chat
- [ ] RTL layout for Arabic displays correctly  
- [ ] Chat flow: welcome → language → intents → responses
- [ ] All action buttons link correctly
- [ ] PII detection shows warnings
- [ ] Mobile responsive on iOS/Android
- [ ] Keyboard navigation works completely
- [ ] Screen reader announces chat messages

### Performance
- Lighthouse scores: Performance ≥90, Accessibility ≥95
- Bundle size optimized with tree shaking
- Images optimized and lazy loaded
- Virtual scrolling for long chat history

## 🚀 Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Environment Setup
1. Set `NEXT_PUBLIC_BOOKING_URL` to your booking system
2. Configure Sentry/PostHog if using telemetry
3. Ensure HTTPS in production
4. Set up appropriate CSP headers

### Integration Notes
- Replace mock API with real backend endpoints
- Connect to actual booking system
- Implement real user session management
- Add production analytics and monitoring

## 📋 TODO for Production

- [ ] Connect to real MSK backend API
- [ ] Implement proper user authentication
- [ ] Add real-time typing indicators
- [ ] Set up production monitoring
- [ ] Add comprehensive error boundaries
- [ ] Implement rate limiting
- [ ] Add automated testing suite
- [ ] Configure production analytics

## 🤝 Contributing

1. Follow the established TypeScript patterns
2. Maintain accessibility standards
3. Test in multiple languages and screen sizes
4. Add proper error handling
5. Update documentation for new features

## 📞 Support

For technical questions about this implementation:
- Review the code comments and type definitions
- Check the browser console for development hints
- Test the API endpoints directly

For MSK-specific content and business logic:
- Contact the MSK Digital team
- Review MSK brand guidelines
- Validate with AYA program requirements

---

Built with ❤️ for Memorial Sloan Kettering Cancer Center Young Adult Program
