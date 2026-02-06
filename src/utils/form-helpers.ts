import { gsap } from "gsap";

interface ToastOptions {
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

export function showToast({ type, message, duration = 5000 }: ToastOptions) {
  let container = document.getElementById(`toast-${type}`);

  if (!container) {
    container = document.createElement("div");
    container.id = `toast-${type}`;
    container.className = `alert alert-${type} fixed top-4 right-4 z-50 max-w-md shadow-lg hidden`;
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    container.innerHTML = `<span id="toast-${type}-text">${message}</span>`;
    document.body.appendChild(container);
  }

  const textElement = container.querySelector(`#toast-${type}-text`);
  if (textElement) textElement.textContent = message;

  gsap.killTweensOf(container);
  gsap.set(container, { opacity: 0, y: -20 });

  container.classList.remove("hidden");

  requestAnimationFrame(() => {
    gsap.to(container, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  });

  setTimeout(() => {
    gsap.to(container, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        container!.classList.add("hidden");
      },
    });
  }, duration);
}

export async function submitFormAJAX(
  formData: Record<string, any>,
  options: {
    onSuccess?: (response: any) => void;
    onError?: (error: any) => void;
    showToast?: boolean;
  } = {}
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
          message: result.message || "Opération effectuée avec succès",
        });
      }
      onSuccess?.(result);
    } else {
      if (showNotification) {
        showToast({
          type: "error",
          message: result.error || "Une erreur est survenue",
        });
      }
      onError?.(result);
    }

    return result;
  } catch (error) {
    if (showNotification) {
      showToast({
        type: "error",
        message: "Erreur de connexion au serveur",
      });
    }
    onError?.(error);
    throw error;
  }
}
