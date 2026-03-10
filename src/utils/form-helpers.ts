import { showAlert } from "./alerts";

interface ToastOptions {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  dismissible?: boolean;
}

export function showToast({
  type,
  message,
  duration = 5000,
  dismissible = true,
}: ToastOptions) {
  showAlert({
    type,
    message,
    duration,
    dismissible,
  });
}

export async function submitFormAJAX(
  formData: Record<string, any>,
  options: {
    onSuccess?: (response: any) => void;
    onError?: (error: any) => void;
    showToast?: boolean;
  } = {},
) {
  const { onSuccess, onError, showToast: showNotification = true } = options;

  try {
    const response = await fetch("/api/form-submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      if (showNotification) {
        showToast({
          type: "success",
          message: result.message || "L'opération a été réalisée avec succès.",
        });
      }
      onSuccess?.(result);
    } else {
      if (showNotification) {
        showToast({
          type: "error",
          message: result.error || "L'opération a échoué. Veuillez réessayer.",
        });
      }
      onError?.(result);
    }

    return result;
  } catch (error) {
    if (showNotification) {
      showToast({
        type: "error",
        message:
          "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.",
      });
    }
    onError?.(error);
    throw error;
  }
}
