import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n/provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MSK Assistant',
  description: 'Get personalized support for your cancer care journey',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load default English messages
  const messages = (await import('../messages/en.json')).default;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <I18nProvider initialMessages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
