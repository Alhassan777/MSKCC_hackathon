import { NextRequest, NextResponse } from 'next/server';
import { SupportedLocale, SessionLocaleRequest, SessionLocaleResponse } from '@/types/chat';
import { getTextDirection } from '@/lib/i18n/config';

// In-memory storage for demo purposes
// In production, this should use a proper database
const sessionLocales = new Map<string, SupportedLocale>();

export async function POST(request: NextRequest) {
  try {
    const body: SessionLocaleRequest = await request.json();
    const { sessionId, locale } = body;

    // Validate locale
    const validLocales: SupportedLocale[] = ['en', 'es', 'ar', 'zh', 'pt'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      );
    }

    // Store session locale
    sessionLocales.set(sessionId, locale);
    
    const dir = getTextDirection(locale);
    
    const response: SessionLocaleResponse = {
      ok: true,
      locale,
      dir,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Session locale API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const locale = sessionLocales.get(sessionId) || 'en';
    const dir = getTextDirection(locale);
    
    const response: SessionLocaleResponse = {
      ok: true,
      locale,
      dir,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Session locale GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
