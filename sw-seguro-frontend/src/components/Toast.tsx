import React, { useEffect } from "react";
import "../styles/Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (duration === Infinity) return;

    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
