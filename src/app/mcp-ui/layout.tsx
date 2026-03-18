import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/env';
import { ChatGPTBootstrap } from './ChatGPTBootstrap';
import './styles.css';

export const metadata: Metadata = {
  title: 'Recipe Flow',
  description: 'Interactive cooking flowchart viewer',
};

export default function McpUiLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = getBaseUrl();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ChatGPTBootstrap baseUrl={baseUrl} />
      </head>
      <body>{children}</body>
    </html>
  );
}
