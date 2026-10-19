import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Q-Safe | AI TC Generator & Release Dashboard',
  description: 'QA Test Case Generator and Real-time Release Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="antialiased text-slate-800 bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
