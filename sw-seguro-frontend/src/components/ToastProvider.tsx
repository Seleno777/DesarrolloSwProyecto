import React, { createContext, useState, useCallback } from "react";
import Toast from "./Toast";
import type { ToastMessage, ToastType } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
);

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType, duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
