# Audit Technique Formulaire/Preview

Date: 3 mars 2026  
Perimetre: creation/edition d'action, shell formulaire + apercu, mobile/tablette/desktop.

## 1) Resume Executif

Le systeme est globalement bon sur l'intention produit:
- edition live du contenu;
- navigation mobile en wizard;
- split formulaire/apercu sur desktop.

Le point faible principal est la robustesse JavaScript (etat responsive, re-init, listeners, fallback de placeholders).  
Conclusion: base solide, mais fiabilisation prioritaire necessaire avant d'ajouter de nouvelles features.

## 2) Architecture Actuelle (Desktop/Mobile/Tablette)

### 2.1 Composition des pages

- Creation: `src/pages/creation/actions/nouveau.astro`
  - monte `ActionEditorShell` avec:
    - slot `form`: `ActionForm` -> `Formulaire`
    - slot `preview`: `ActionContent`
- Edition: `src/pages/creation/actions/edit/[id]-[slug].astro`
  - meme architecture avec `animateDesktopSidebar`.

### 2.2 Responsivite et comportement

- Breakpoint principal shell: `1024px`
  - `< 1024`: onglets `Formulaire` / `Apercu` dans `ActionEditorShell`.
  - `>= 1024`: formulaire + apercu affiches en parallele.
- Wizard mobile du formulaire:
  - actif quand `uiMode="mobile-wizard"` et viewport `<= 1023px`.
  - 7 etapes, nav `Precedent/Suivant`, validation par etape.
- Preview tablette "comme mobile":
  - active via `tabletPreviewAsMobile={true}`.
  - script qui retire/restaure dynamiquement les classes `md:*`.

### 2.3 Scripts et flux de donnees

- `src/scripts/preview/init.js`
  - initialise `previewState`, bind des champs `data-prop`, sync hidden fields.
- `src/scripts/preview/render.js`
  - met a jour le DOM de l'apercu (texte, images, sections conditionnelles).
- `src/scripts/actionForm/mobileWizard.js`
  - gere affichage des etapes et validation mobile.
- `src/components/actionForm/ActionEditorShell.astro` (script inline)
  - gere les onglets mobile + affichage panels form/preview.

## 3) Findings (Classes par Severite)

### 3.1 Critique

1. Fallback placeholder instable pouvant casser le preview live
- Zone: `src/scripts/preview/init.js`
- Probleme: reference a `DEFAULT_PLACEHOLDERS` non defini dans la branche fallback.
- Impact:
  - risque de `ReferenceError` sur champ vide selon le prop traite;
  - script preview interrompu, plus de mise a jour live.
- Reproduction typique:
  1. Ouvrir formulaire.
  2. Vider un champ dont la cle n'a pas de valeur dans `PREVIEW_DEFAULTS`.
  3. Observer l'absence de refresh preview et/ou erreur console.

### 3.2 Eleve

2. Etat onglets/panels pas suffisamment deterministe sur transitions mobile/tablette/desktop
- Zone: `src/components/actionForm/ActionEditorShell.astro`
- Probleme:
  - l'etat combine `hidden` + `style.display` + `aria-hidden`;
  - re-init possible sur `astro:page-load`, risque de desynchronisation visuelle.
- Impact:
  - cas "Apercu clique mais rien ne se passe";
  - cas "panel present dans DOM mais non visible".
- Reproduction typique:
  1. Passer de mobile a tablette puis desktop.
  2. Revenir sur mobile.
  3. Cliquer plusieurs fois onglets.
  4. Observer etat incoherent ponctuel.

3. Wizard mobile sensible aux doubles initialisations
- Zone: `src/scripts/actionForm/mobileWizard.js`
- Probleme:
  - pas de garde d'init explicite sur le formulaire;
  - listeners pouvant etre binds plusieurs fois selon navigation.
- Impact:
  - etapes qui semblent "disparaitre";
  - navigation step instable.
- Reproduction typique:
  1. Naviguer entre pages creation/edit.
  2. Revenir sur le formulaire.
  3. Observer comportements duplicatifs dans la navigation.

### 3.3 Moyen

4. Strategie tablette basee sur retrait global de classes `md:*`
- Zone: `src/components/ActionContent.astro` (script inline tablette).
- Probleme:
  - mutation de toutes les classes `md:*` dans le subtree preview;
  - mecanisme fragile a long terme.
- Impact:
  - regressions CSS difficiles a diagnostiquer sur nouveaux composants.

5. Accessibilite onglets mobile partielle
- Zone: `ActionEditorShell.astro`
- Probleme:
  - manque de roles ARIA complets type `tablist/tab/tabpanel`;
  - `aria-selected` non maintenu explicitement.
- Impact:
  - navigation clavier/lecteur d'ecran sous-optimale.

## 4) Risques de Regression

- Regression de visibilite panels (form/preview) sur changement de viewport.
- Regression wizard (step courant, validation, soumission).
- Regression sur hidden inputs relies au preview.
- Regression CSS tablette si mecanisme `md:*` touche des classes non prevues.
- Regression d'accessibilite si changement incomplet des attributs ARIA.

## 5) Plan de Correction Ordonne (Critique -> Mineur)

## Etape 1 (ce document)
- Creer l'audit et figer le plan.
- Validation: ok contenu + ordre des priorites.

## Etape 2
- Cible: `src/scripts/preview/init.js`
- Actions:
  - supprimer la dependance `DEFAULT_PLACEHOLDERS`;
  - centraliser fallback sur `PREVIEW_DEFAULTS` + chaine vide securisee;
  - securiser lecture de `window.__previewData` avec fallback `{}`.
- Resultat attendu:
  - aucun crash preview quand un champ est vide.

## Etape 3
- Cible: `src/components/actionForm/ActionEditorShell.astro`
- Actions:
  - normaliser l'etat des panels (`hidden`, `display`, `aria-hidden`);
  - comportement identique pour `< 1024` (mobile + tablette);
  - ajouter a11y minimum (`tablist/tab/aria-selected`);
  - verifier robustesse re-init `astro:page-load`.
- Resultat attendu:
  - bouton `Apercu` fiable en toutes circonstances.

## Etape 4
- Cible: `src/scripts/actionForm/mobileWizard.js`
- Actions:
  - garde d'initialisation pour eviter listeners dupliques;
  - coherence d'etat step sur changement viewport;
  - conserver validation step + exceptions brouillon/publication.
- Resultat attendu:
  - sections et navigation wizard stables.

## Etape 5
- Cible: `src/components/ActionContent.astro`
- Actions:
  - encadrer strictement la logique tablette;
  - eviter mutations inutiles hors `768-1023`;
  - garantir restauration propre a `>=1024`.
- Resultat attendu:
  - rendu tablette proche mobile sans casser desktop.

## 6) Matrice de Tests Manuels

| ID | Scenario | Viewport | Attendu |
|---|---|---|---|
| T1 | Onglet vers `Apercu` puis retour `Formulaire` | 375x812 | panel actif visible, autre masque, pas d'etat bloque |
| T2 | Meme test onglets | 768x1024 | comportement identique mobile |
| T3 | Layout desktop | 1280x800 | form + preview visibles simultanement |
| T4 | Vider/remplir champs texte (dont remerciements) | 375 + 1280 | preview live sans erreur console |
| T5 | Changer images (hero/parties), supprimer image | 375 + 1280 | rendu preview coherent, hidden fields synchronises |
| T6 | Wizard etapes 1 -> 7 puis retour 7 -> 1 | 375x812 | nav stable, erreurs de validation pertinentes |
| T7 | Soumission create/edit + brouillon/publication | 375 + 1280 | actions autorisees selon regles step |
| T8 | Resize 375 -> 768 -> 1024 -> 1280 -> 375 | multi | pas de panel "fantome", pas de perte d'etat incoherente |
| T9 | Navigation page puis retour (si route load) | multi | pas de duplication d'events visible |
| T10 | Build projet | n/a | `npm run build` passe sans erreur bloquante |

## 7) Criteres d'Acceptation Globaux

- Plus aucun blocage "Apercu ne s'affiche pas".
- Plus aucun symptome "sections cachees mais presentes".
- Preview live stable quand les champs sont vides/edites.
- Wizard mobile stable apres navigations et resizes.
- Build OK apres chaque etape.

## 8) Cadence de Livraison Validee

- 1 etape = 1 correction ciblee + 1 point de synthese + 1 build.
- Arret systematique entre etapes pour validation utilisateur.
