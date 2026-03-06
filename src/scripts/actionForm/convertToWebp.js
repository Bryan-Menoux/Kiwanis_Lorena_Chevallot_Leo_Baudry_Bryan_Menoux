// convertToWebp.js
// Conversion client-side des images uploadées en WebP avant soumission du formulaire.
// Qualité : 0.82 → bon équilibre poids/qualité (pertes quasi-imperceptibles à l'œil).
// Les fichiers déjà en WebP ou non-images sont renvoyés tels quels.
// Le nom du fichier est conservé avec l'extension .webp.

const WEBP_QUALITY = 0.82;

// Attribut posé sur le formulaire pendant le cycle "conversion → re-submit".
const WEBP_CONVERTED_ATTR = 'data-webp-converted';

// Convertit un File image en WebP via canvas.
// file : File — image source
// quality : number — 0.0 à 1.0
// Retourne le fichier converti, ou l'original si déjà WebP / non-image / échec.
function convertFileToWebp(file, quality) {
  // Déjà WebP ou pas une image → on passe directement
  if (file.type === 'image/webp' || !file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const webpName = file.name.replace(/\.[^.]+$/, '.webp');
          resolve(new File([blob], webpName, { type: 'image/webp' }));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback : on envoie le fichier original
    };

    img.src = url;
  });
}

// Convertit tous les fichiers d'un input[type=file] en WebP.
// Recrée la FileList via DataTransfer et la ré-assigne à l'input.
async function convertInputFilesToWebp(input, quality) {
  if (!input.files || input.files.length === 0) return;

  const converted = await Promise.all(
    Array.from(input.files).map((f) => convertFileToWebp(f, quality)),
  );

  const dt = new DataTransfer();
  converted.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}

// Initialise le listener de conversion WebP sur le formulaire #leftForm.
// Doit être appelé APRÈS initActionFormRequiredValidation pour que la vérification
// de event.defaultPrevented soit fiable.
export function initWebpConversion() {
  const form = document.getElementById('leftForm');
  if (!(form instanceof HTMLFormElement)) return;

  // Garde contre les doubles initialisations (astro:page-load)
  if (form.dataset.webpConversionInit === 'true') return;
  form.dataset.webpConversionInit = 'true';

  form.addEventListener('submit', async (event) => {
    // Si la validation a stoppé la soumission, on ne convertit pas.
    if (event.defaultPrevented) return;

    // Si les images ont déjà été converties lors de ce cycle → on laisse passer.
    if (form.getAttribute(WEBP_CONVERTED_ATTR) === 'true') {
      form.removeAttribute(WEBP_CONVERTED_ATTR);
      return;
    }

    event.preventDefault();

    const submitter =
      event.submitter instanceof HTMLButtonElement ||
      event.submitter instanceof HTMLInputElement
        ? event.submitter
        : null;

    // --- Conversion ---
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"][data-prop-file]'));

    try {
      await Promise.all(
        fileInputs.map((input) => convertInputFilesToWebp(input, WEBP_QUALITY)),
      );
    } catch (err) {
      // En cas d'erreur imprévue, on soumet quand même (avec les fichiers originaux).
      console.error('[WebP] Erreur lors de la conversion :', err);
    }

    // --- Re-soumission ---
    form.setAttribute(WEBP_CONVERTED_ATTR, 'true');

    // La validation a supprimé data-publish-confirmed avant que ce listener s'exécute.
    // On le restaure pour que le deuxième passage de validation le retrouve.
    if (submitter?.name === 'publish_action') {
      form.setAttribute('data-publish-confirmed', 'true');
    }

    if (submitter) {
      form.requestSubmit(submitter);
    } else {
      form.requestSubmit();
    }
  });
}
