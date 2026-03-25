# Implémentation du consentement cookies et services externes - Kiwanis

Date : 25 mars 2026

## 1. Périmètre vérifié dans le code

Éléments réellement détectés dans le dépôt :

- Cookie d’authentification PocketBase `pb_auth` côté serveur :
  `src/middleware/index.ts`, `src/pages/connexion.astro`
- `sessionStorage` technique dans l’espace membre :
  `src/pages/mon-compte.astro`
- `localStorage` technique pour le wizard mobile :
  `src/scripts/actionForm/mobileWizard.js`
- Polices locales via Fontsource :
  `src/styles/global.css`, `package.json`
- Carte Leaflet avec tuiles OpenStreetMap :
  `src/pages/index.astro`
- Recherche d’adresse via Nominatim :
  `src/components/searchLocation.astro`
- Liens sortants uniquement après clic :
  Google Maps, Google Calendar, Facebook
- Possibilité d’URLs d’images externes dans certains contenus :
  `src/utils/utilitaires.js`, `src/components/ActionContent.astro`, `src/pages/actions/index.astro`

Absences confirmées dans le dépôt audité :

- pas de Google Analytics
- pas de Matomo
- pas de Meta Pixel
- pas de CMP préexistante
- pas de reCAPTCHA
- pas d’iframe YouTube/Vimeo/Google Maps
- pas de service worker explicite
- pas d’IndexedDB détecté

## 2. Qualification retenue

### Toujours actifs car strictement nécessaires

- `pb_auth` :
  cookie d’authentification et de session pour l’espace membre/admin
- `sessionStorage` dans `/mon-compte` :
  cache technique d’interface
- `localStorage` du wizard mobile :
  mémorisation d’étape d’un formulaire
- stockage local de la préférence de consentement :
  clé `kiwanis_cookie_preferences`, uniquement pour mémoriser le choix utilisateur

### Soumis au choix utilisateur

- Carte OpenStreetMap sur la page d’accueil
- Suggestions d’adresse Nominatim dans l’espace de création

### Cas documenté mais non confirmé en production

- Images `http(s)` externes possibles si des contenus enregistrés en base utilisent une URL externe

Ce dernier point dépend des données réellement présentes dans PocketBase. Le dépôt autorise ce cas, mais ne permet pas de confirmer qu’il est utilisé en production.

## 3. Catégories de consentement implémentées

Deux catégories seulement :

- `Cookies techniques essentiels`
- `Contenus et services externes`

Aucune catégorie `analytics`, `publicité` ou `réseaux sociaux` n’a été créée, car rien dans le code ne la justifie.

## 4. Ce qui a été bloqué ou conditionné

### Bloqué par défaut

- Carte OpenStreetMap :
  pas de chargement des tuiles tant que la catégorie `services externes` n’est pas accordée
- Nominatim :
  pas de requête de suggestion tant que la catégorie `services externes` n’est pas accordée

### Toujours actif

- polices locales Fontsource pour `Poppins` et `Merriweather`
- cookie `pb_auth`
- `sessionStorage` dans `/mon-compte`
- `localStorage` du wizard mobile
- liens sortants simples vers Google Maps, Google Calendar et Facebook

## 5. Stockage du choix utilisateur

- support :
  `localStorage`
- clé :
  `kiwanis_cookie_preferences`
- durée :
  180 jours
- contenu :
  version, date de mise à jour, date d’expiration, état de la catégorie `externalServices`

## 6. Fichiers modifiés

- `src/utils/consent.ts`
- `src/components/ConsentManager.astro`
- `src/components/ConsentManagedImage.astro`
- `src/layouts/Layout.astro`
- `src/layouts/Layout-back-office.astro`
- `src/styles/global.css`
- `package.json`
- `src/pages/index.astro`
- `src/components/searchLocation.astro`
- `src/components/Footer.astro`
- `src/pages/cookies.astro`
- `src/pages/mentions-legales.astro`

## 7. Points à vérifier manuellement en production

- vérifier dans le navigateur le cookie `pb_auth` réel :
  nom, durée, attributs `Secure`, `HttpOnly`, `SameSite`
- vérifier qu’aucune requête vers `fonts.googleapis.com` ou `fonts.gstatic.com` ne part plus du tout
- vérifier qu’aucune requête vers `tile.openstreetmap.org` ne part avant consentement
- vérifier qu’aucune requête vers `nominatim.openstreetmap.org` ne part avant consentement
- vérifier le comportement du bouton `Gérer mes cookies` dans le footer
- vérifier que le refus est conservé et que le panneau ne réapparaît pas à chaque page
- vérifier si des contenus PocketBase existants utilisent déjà des URLs d’images externes
- vérifier que le rendu des polices locales correspond bien à l’ancien rendu attendu

## 8. Limites connues

- Le dépôt permet des URLs d’images externes, mais le blocage complet de ce cas sur toutes les pages n’a pas été généralisé ici faute de preuve d’usage effectif dans les données de production.
- Si des médias externes sont effectivement utilisés en production, il faudra compléter le conditionnement côté composants qui les affichent.
