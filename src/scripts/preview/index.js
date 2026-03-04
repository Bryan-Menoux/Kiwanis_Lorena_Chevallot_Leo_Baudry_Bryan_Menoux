import { initPreview } from './init.js';

// Le module de prévisualisation est utilisé sur des pages SSR et parfois réhydratées.
// Cette garde évite de rater l'initialisation si le DOM est déjà prêt.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreview);
} else {
  initPreview();
}
