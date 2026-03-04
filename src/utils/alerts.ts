export type AlertType = "success" | "error" | "warning" | "info";

export interface AlertPayload {
  message: string;
  type?: AlertType;
  duration?: number;
  dismissible?: boolean;
}

export interface ConfirmPayload {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: Exclude<AlertType, "info"> | "info";
}

interface QueuedConfirm {
  payload: Required<ConfirmPayload>;
  resolve: (value: boolean) => void;
}

declare global {
  interface Window {
    KiwanisAlert?: {
      show: (payload: AlertPayload | string) => void;
      confirm: (payload: ConfirmPayload | string) => Promise<boolean>;
    };
    __kiwanisAlertQueue?: Array<Required<AlertPayload>>;
    __kiwanisConfirmQueue?: Array<QueuedConfirm>;
  }
}

const DEFAULT_DURATION = 5000;

function normalizeAlert(payload: AlertPayload | string): Required<AlertPayload> {
  if (typeof payload === "string") {
    return {
      message: payload,
      type: "info",
      duration: DEFAULT_DURATION,
      dismissible: true,
    };
  }

  return {
    message: payload.message || "Une notification est disponible.",
    type: payload.type || "info",
    duration: payload.duration ?? DEFAULT_DURATION,
    dismissible: payload.dismissible ?? true,
  };
}

function normalizeConfirm(
  payload: ConfirmPayload | string,
): Required<ConfirmPayload> {
  if (typeof payload === "string") {
    return {
      message: payload,
      title: "Confirmation",
      confirmLabel: "Confirmer",
      cancelLabel: "Annuler",
      type: "warning",
    };
  }

  return {
    message: payload.message || "Confirmez votre action.",
    title: payload.title || "Confirmation",
    confirmLabel: payload.confirmLabel || "Confirmer",
    cancelLabel: payload.cancelLabel || "Annuler",
    type: payload.type || "warning",
  };
}

export function showAlert(payload: AlertPayload | string) {
  if (typeof window === "undefined") return;

  const normalized = normalizeAlert(payload);

  if (window.KiwanisAlert?.show) {
    window.KiwanisAlert.show(normalized);
    return;
  }

  if (!Array.isArray(window.__kiwanisAlertQueue)) {
    window.__kiwanisAlertQueue = [];
  }

  window.__kiwanisAlertQueue.push(normalized);
}

export function showConfirm(payload: ConfirmPayload | string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  const normalized = normalizeConfirm(payload);

  if (window.KiwanisAlert?.confirm) {
    return window.KiwanisAlert.confirm(normalized);
  }

  return new Promise((resolve) => {
    if (!Array.isArray(window.__kiwanisConfirmQueue)) {
      window.__kiwanisConfirmQueue = [];
    }

    window.__kiwanisConfirmQueue.push({
      payload: normalized,
      resolve,
    });
  });
}

export function showToast(payload: AlertPayload | string) {
  showAlert(payload);
}
