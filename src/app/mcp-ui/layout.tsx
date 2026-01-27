import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Recipe Flow',
  description: 'Interactive cooking flowchart viewer',
};

export default function McpUiLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
