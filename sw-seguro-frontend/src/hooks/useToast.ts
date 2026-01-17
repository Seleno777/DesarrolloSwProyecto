import { useContext } from "react";
import { ToastContext } from "../components/ToastProvider";
import type { ToastType } from "../components/Toast";

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }

  return {
    success: (message: string, duration?: number) =>
      context.showToast(message, "success", duration),
    error: (message: string, duration?: number) =>
      context.showToast(message, "error", duration),
    warning: (message: string, duration?: number) =>
      context.showToast(message, "warning", duration),
    info: (message: string, duration?: number) =>
      context.showToast(message, "info", duration),
    show: (message: string, type: ToastType, duration?: number) =>
      context.showToast(message, type, duration),
  };
};
