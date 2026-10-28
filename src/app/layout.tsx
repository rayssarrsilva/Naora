import type { ReactNode } from 'react';

// The real root layout lives in [locale]/layout.tsx, which renders <html lang>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
