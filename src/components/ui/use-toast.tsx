'use client';

import * as React from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
};

type ToastActionElement = React.ReactElement<HTMLButtonElement>;

type Toast = ToastProps & {
  id: string;
  action?: ToastActionElement;
};

// Создаем состояние для хранения тостов (глобально)
let toasts: Toast[] = [];
let listeners: Array<() => void> = [];

// Функция для обновления всех слушателей
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Функция для добавления тоста
export const toast = (props: ToastProps) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { ...props, id };
  
  toasts = [...toasts, newToast];
  notifyListeners();
  
  // Автоматическое удаление тоста по таймауту
  if (props.duration !== Infinity) {
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, props.duration || 5000);
  }
  
  return {
    id,
    dismiss: () => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    },
    update: (props: ToastProps) => {
      toasts = toasts.map(t => t.id === id ? { ...t, ...props, id } : t);
      notifyListeners();
    }
  };
};

// Хук для использования тостов
export function useToast() {
  const [, setForceUpdate] = React.useState({});
  
  React.useEffect(() => {
    const update = () => setForceUpdate({});
    listeners.push(update);
    return () => {
      listeners = listeners.filter(listener => listener !== update);
    };
  }, []);
  
  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }
  };
}

// UI компонент Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss } = useToast();
  
  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${
                toast.variant === "destructive"
                  ? "bg-red-500"
                  : toast.variant === "success"
                  ? "bg-green-500"
                  : "bg-gray-800"
              } text-white p-4 rounded-md shadow-lg max-w-md`}
            >
              {toast.title && <div className="font-bold">{toast.title}</div>}
              {toast.description && <div>{toast.description}</div>}
              <button
                onClick={() => dismiss(toast.id)}
                className="absolute top-2 right-2 text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
} 