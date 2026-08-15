import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Agent Analytics Platform',
  description: 'Real-time Big Data analytics for AI-agent execution events — powered by Kafka, Druid, Iceberg, and Spark.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#0a0f1e' }}>
        {children}
      </body>
    </html>
  );
}
