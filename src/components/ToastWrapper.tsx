'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/use-toast';

export default function ToastWrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
} 