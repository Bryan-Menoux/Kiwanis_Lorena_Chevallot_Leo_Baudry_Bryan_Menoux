# Audit cookies et traceurs du projet Kiwanis

## 1. Résumé exécutif

Dans l'état actuel du code, le projet ne contient pas d'outil d'analytics, pas de pixel publicitaire, pas de widget social embarqué, pas d'iframe YouTube/Vimeo/Google Maps, pas de reCAPTCHA et pas de gestionnaire de consentement déjà intégré. Les seuls mécanismes de stockage clairement détectés sont :

- un cookie d'authentification PocketBase côté serveur (`pb_auth`) pour l'espace membre/admin ;
- un `sessionStorage` technique pour éviter des rechargements inutiles dans `/mon-compte` ;
- un `localStorage` technique pour mémoriser l'étape d'un formulaire mobile ;
- plusieurs appels réseau vers des services tiers, surtout Google Fonts, OpenStreetMap/Nominatim et des liens sortants Google/Facebook.

Réponse nette aux questions demandées :

- Est-ce qu'un bandeau cookies est nécessaire dans l'état actuel du projet : pas pour les seuls cookies/stockages strictement nécessaires, mais la situation n'est pas entièrement "sans consentement" à cause des ressources tierces chargées automatiquement.
- Est-ce qu'une simple politique cookies suffit : non, pas complètement tant que Google Fonts et certains appels OpenStreetMap/Nominatim partent automatiquement dès l'affichage ou la saisie.
- Quels sont les points bloquants éventuels : `@import` Google Fonts dans `src/styles/global.css`, chargement automatique des tuiles OpenStreetMap sur la page d'accueil, appel Nominatim pendant la saisie dans `src/components/searchLocation.astro`, et possibilité d'afficher des images externes saisies via URL dans certains contenus.
- Quelle est la solution la plus simple et la plus propre pour ce projet : supprimer les polices Google hébergées à distance, garder le cookie PocketBase sans bandeau, et charger les contenus tiers cartographiques uniquement après action explicite de l'utilisateur ou les remplacer par de simples liens sortants.

Conclusion pratique : si vous corrigez les chargements tiers automatiques, vous pouvez défendre une position simple de type "pas de bandeau cookies pour l'instant, seulement une information claire sur les cookies techniques et les contenus externes activés à la demande".

## 2. Méthode d'analyse

L'audit a été réalisé par lecture du dépôt, sans supposer des services inexistants.

Éléments inspectés :

- configuration et runtime Astro : `astro.config.mjs`, `src/middleware/index.ts`, layouts ;
- pages publiques et privées : `src/pages/**` ;
- composants et scripts front : `src/components/**`, `src/scripts/**`, `src/utils/**` ;
- endpoints API : `src/pages/api/**` ;
- dépendances : `package.json` et comportement documenté/local du SDK `pocketbase` installé ;
- fichiers publics : `public/**`, dont `site.webmanifest`.

Vérifications ciblées :

- `Set-Cookie`, `document.cookie`, `localStorage`, `sessionStorage`, `IndexedDB`, service worker, cache navigateur explicite ;
- SDK PocketBase et auth store ;
- scripts externes, CDN, iframes, embeds, widgets sociaux, analytics, pixels ;
- appels réseau vers domaines externes ;
- contenus et images potentiellement chargés depuis des URLs externes stockées en base.

Base juridique utilisée pour qualifier les cas :

- article 82 de la loi Informatique et Libertés, transposant l'article 5(3) ePrivacy ;
- doctrine CNIL sur les cookies et autres traceurs : consentement préalable sauf exemption pour les traceurs strictement nécessaires ;
- position CNIL sur les contenus externes : consentement pouvant être recueilli de manière contextuelle avant activation du contenu tiers ;
- position CNIL sur la mesure d'audience : exemption seulement sous conditions strictes, non applicable ici car aucun outil de mesure d'audience n'est présent dans le code.

Sources officielles utilisées :

- CNIL, "Cookies et traceurs : que dit la loi ?" : https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
- CNIL, "Cookies et traceurs : comment mettre mon site web en conformité ?" : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite
- CNIL, FAQ "cookies et autres traceurs" : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ

## 3. Inventaire complet des traceurs et stockages détectés

| Élément détecté | Type | Fichier ou emplacement | Finalité | Domaine concerné | Dépôt au chargement ou après action | Consentement requis ou non | Niveau de confiance | Commentaire |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cookie `pb_auth` émis par PocketBase | Cookie HTTP | `src/middleware/index.ts:134,187-188`, `src/pages/connexion.astro:44-48` | Maintien de session et authentification membre/admin | Site Kiwanis + PocketBase applicatif | Au login puis renvoyé sur réponses SSR non prerender | Non, traceur strictement nécessaire | Élevé | Cookie serveur central pour la session ; conforme au cas CNIL des traceurs d'authentification |
| Chargement du cookie `pb_auth` à chaque requête SSR | Lecture de cookie HTTP | `src/middleware/index.ts:134-141` | Restaurer et rafraîchir la session serveur | Site Kiwanis | À chaque requête sur pages SSR | Non | Élevé | Lecture strictement nécessaire au service demandé |
| `sessionStorage` `hash-my-account`, `hash-verifications`, `hash-modifications` | Session Storage | `src/pages/mon-compte.astro:211,219` | Cache technique de hash pour éviter des rechargements inutiles de sections | Navigateur local | Après navigation dans l'espace compte | Non, stockage technique exempté | Élevé | Pas de finalité publicitaire, pas de partage tiers |
| `localStorage` `kc_action_wizard_step_*` | Local Storage | `src/scripts/actionForm/mobileWizard.js:24-27,156` | Mémoriser l'étape d'un formulaire mobile d'édition | Navigateur local | Pendant l'usage du formulaire de création | Non, personnalisation d'interface attendue | Élevé | Traceur local purement fonctionnel |
| Google Fonts via CSS import | Ressource tierce, appel réseau | `src/styles/global.css:1` | Charger les polices `Poppins` et `Merriweather` | `fonts.googleapis.com` et probablement `fonts.gstatic.com` | Au chargement de presque toutes les pages | Oui ou à supprimer/remplacer | Élevé | Pas strictement nécessaire ; transfert à un tiers dès affichage |
| Carte Leaflet locale | Script front local | `src/pages/index.astro:459-485` | Afficher une carte interactive | Domaine du site pour le chunk JS ; pas de CDN JS | Après intersection / survol / touch sur la zone carte | Non pour le script local lui-même | Élevé | Leaflet est bundle localement, ce n'est pas le point de conformité |
| Tuiles de carte OpenStreetMap | Contenu tiers / requêtes réseau | `src/pages/index.astro:506-509` | Afficher le fond de carte | `tile.openstreetmap.org` | Déclenché automatiquement quand le composant carte se charge | Oui si maintenu tel quel ; sinon charger après clic | Élevé | Pas un cookie applicatif prouvé, mais appel tiers automatique avec IP/User-Agent/Referrer |
| Recherche d'adresse Nominatim | Contenu tiers / requêtes réseau | `src/components/searchLocation.astro:148-149` | Autocomplétion d'adresse en back-office | `nominatim.openstreetmap.org` | Après saisie utilisateur à partir de 3 caractères | Plutôt exemptable sans bandeau global si activation volontaire, mais à encadrer | Moyen | Pas de cookie identifié dans le code, mais transfert vers un tiers au fil de la saisie |
| Liens sortants Google Maps | Lien externe | `src/pages/index.astro:84,289,301-307`, `src/components/searchLocation.astro:124`, `src/components/ActionContent.astro:351-359` | Ouvrir une carte externe | `maps.google.com`, `google.com` | Après clic | Non pour le site avant clic | Élevé | Un simple lien sortant n'impose pas un bandeau sur votre site |
| Lien Google Calendar | Lien externe | `src/pages/projets.astro:185-198` | Ajouter un projet à l'agenda Google | `calendar.google.com` | Après clic | Non pour le site avant clic | Élevé | Pas d'embed ni chargement automatique |
| Liens Facebook | Lien externe | `src/components/Footer.astro:5,150-166`, `src/pages/contact.astro:10,221-226`, `src/pages/produits.astro:162` | Rediriger vers une page Facebook | `facebook.com` | Après clic | Non pour le site avant clic | Élevé | Aucun widget social, aucun SDK Facebook détecté |
| Images / médias externes possibles via URL | Contenu externe potentiellement embarqué | `src/utils/utilitaires.js:163-170`, `src/components/ActionContent.astro` | Afficher une image dont la valeur est une URL `http(s)` | Domaine arbitraire saisi en contenu | Au rendu de la page si une URL externe est enregistrée | Oui si utilisé avec un domaine tiers externe | Moyen | Le code autorise explicitement des URLs externes ; impossible de confirmer leur présence réelle sans base de données |
| Fichiers et images PocketBase | Ressource applicative liée à l'auth et aux médias | nombreux appels `Astro.locals.pb.files.getURL(...)` | Servir médias et données du site | `pb.kiwanis-pays-de-montbeliard.fr` ou équivalent | Au rendu des pages utilisant des médias | Non si même responsable de traitement et usage applicatif | Moyen à élevé | Techniquement domaine distinct, mais infrastructure applicative propre au projet, pas un tiers publicitaire |
| `site.webmanifest` | Métadonnée PWA | `public/site.webmanifest` | Installation web app | Domaine du site | Au chargement si référencé | Non | Élevé | Aucun service worker détecté ; pas de cache applicatif explicite |
| Analytics, pixels, CMP, iframes, reCAPTCHA, YouTube, Vimeo, widgets sociaux | Absence constatée | recherche globale du dépôt | Sans objet | Sans objet | Sans objet | Sans consentement car absent | Élevé | Aucun élément trouvé dans le code inspecté |

## 4. Analyse juridique et pratique

### 4.1 Cookie d'authentification PocketBase

Ce que fait le code :

- `src/middleware/index.ts` charge le cookie entrant via `loadFromCookie(...)`, tente `authRefresh()`, puis réémet `set-cookie` avec `exportToCookie()`.
- `src/pages/connexion.astro` réémet aussi le cookie après authentification réussie.
- Le SDK PocketBase installé indique localement que `exportToCookie()` crée par défaut un cookie `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, avec expiration issue du token.

Qualification :

- C'est un traceur strictement nécessaire au service expressément demandé par l'utilisateur : accéder à l'espace membre/admin.
- La CNIL cite explicitement parmi les exemptions les traceurs destinés à l'authentification et à la sécurité du mécanisme d'authentification.

Action concrète :

- Conserver ce cookie.
- Le documenter dans une politique cookies / mentions légales.
- Vérifier en recette que le cookie n'est présent qu'en cas d'authentification utile et que ses attributs restent bien sécurisés en production.

### 4.2 `sessionStorage` dans `/mon-compte`

Ce que fait le code :

- `src/pages/mon-compte.astro` lit puis écrit des hash de section pour éviter des rechargements inutiles.

Qualification :

- Stockage local technique, limité à l'interface, sans finalité publicitaire ni tiers.
- Pas de consentement préalable requis.

Action concrète :

- Conserver.
- Le mentionner brièvement comme stockage technique d'interface.

### 4.3 `localStorage` du wizard mobile

Ce que fait le code :

- `src/scripts/actionForm/mobileWizard.js` persiste l'étape courante du formulaire.

Qualification :

- Personnalisation d'interface attendue par l'utilisateur dans un formulaire d'édition.
- Exempté en pratique, car strictement fonctionnel et local.

Action concrète :

- Conserver.
- Idéalement ajouter un `removeItem` à la soumission réussie ou à l'abandon si vous voulez éviter des reliquats inutiles, mais ce n'est pas un bloquant cookies.

### 4.4 Google Fonts chargées depuis Google

Ce que fait le code :

- `src/styles/global.css` importe directement `https://fonts.googleapis.com/...`.
- Cela implique aussi des requêtes vers `fonts.gstatic.com` pour les fichiers de police.

Qualification :

- Ce n'est pas strictement nécessaire au fonctionnement du service.
- Ce n'est pas un cookie HTTP prouvé dans le code, mais c'est bien un chargement tiers automatique pouvant s'analyser comme recours à un traceur ou, à minima, comme transfert automatique de données de connexion vers un tiers dès l'affichage.
- Pour un projet simple et défendable, c'est inutilement fragile juridiquement.

Action concrète :

- Recommandation forte : auto-héberger les polices ou les remplacer par des polices locales.
- C'est la correction la plus simple pour éviter d'avoir à justifier un tiers chargé automatiquement sur toutes les pages.

### 4.5 Carte OpenStreetMap sur la page d'accueil

Ce que fait le code :

- `src/pages/index.astro` charge Leaflet localement, puis appelle `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Le chargement n'est pas immédiat au tout premier paint, mais il est automatique dès que la zone entre dans l'`IntersectionObserver` ou au survol/touch.

Qualification :

- Il n'y a pas de cookie identifié dans le code.
- En revanche, il y a bien appel automatique à un service tiers sans consentement préalable dès que la carte approche du viewport.
- CNIL : pour les contenus externes, une activation contextuelle avant chargement est la voie propre quand le service tiers n'est pas nécessaire au fonctionnement principal du site.

Action concrète :

- Option propre : remplacer la carte par un bloc statique + bouton "Activer la carte OpenStreetMap".
- Option encore plus simple : supprimer la carte interactive et garder l'adresse + lien "Ouvrir dans Google Maps / OpenStreetMap".
- Si vous gardez l'auto-chargement actuel, la défense "aucun bandeau nécessaire" devient plus fragile.

### 4.6 Nominatim pour l'autocomplétion d'adresse

Ce que fait le code :

- `src/components/searchLocation.astro` appelle `https://nominatim.openstreetmap.org/search?...` à partir de 3 caractères saisis.

Qualification :

- Ce n'est pas un cookie strictement nécessaire au sens classique.
- Le déclenchement intervient après une action utilisateur dans un contexte back-office, ce qui réduit fortement le risque pratique.
- Juridiquement, c'est un transfert vers un service tiers et non un simple stockage local ; il vaut mieux l'assumer comme "contenu tiers activé par l'utilisateur" que comme "totalement invisible juridiquement".

Action concrète :

- Ajouter une mention discrète près du champ : "La recherche d'adresse interroge OpenStreetMap/Nominatim".
- Option plus propre : n'appeler Nominatim qu'après clic sur "Rechercher l'adresse", pas à chaque frappe.
- Option maximale : proxyfier la requête côté serveur pour éviter un appel direct du navigateur à un tiers.

### 4.7 Liens sortants Google, Facebook, Google Calendar

Ce que fait le code :

- Plusieurs boutons ouvrent des services tiers après clic volontaire.

Qualification :

- Un lien sortant simple n'impose pas de bandeau cookies sur votre site.
- La bonne pratique CNIL est même souvent de préférer un lien simple à un widget embarqué.

Action concrète :

- Conserver cette logique.
- Ne pas remplacer ces liens par des widgets ou iframes sans prévoir un blocage préalable.

### 4.8 URLs d'images externes acceptées par le code

Ce que fait le code :

- `src/utils/utilitaires.js` accepte explicitement des valeurs `http://` ou `https://` comme sources d'images.
- `src/components/ActionContent.astro` les rend ensuite dans des balises `<img>`.

Qualification :

- Le dépôt ne prouve pas que de telles URLs sont déjà utilisées en base.
- En revanche, le code le permet. Si un contenu en base pointe vers un domaine externe, le navigateur appellera automatiquement ce tiers à l'affichage.

Action concrète :

- Recommandation forte : limiter les médias affichables à PocketBase ou au domaine du site.
- À défaut, prévoir une règle éditoriale stricte et une vérification manuelle des contenus existants.

## 5. Cas spécifiques à Kiwanis

### 5.1 Authentification membres/admin

- Le mécanisme repose sur PocketBase côté serveur, pas sur un SDK navigateur initialisé dans le front.
- Le dépôt ne montre pas d'usage navigateur de `new PocketBase(...)` avec `LocalAuthStore`; le risque d'un stockage d'auth en `localStorage` côté client n'est donc pas constaté dans ce projet.
- Le stockage principal d'auth est le cookie HTTP `pb_auth`, nécessaire au service.
- Verdict : compatible avec une approche sans bandeau, à documenter comme cookie strictement nécessaire.

### 5.2 Éventuelle carte

- Une vraie carte interactive existe sur la home via Leaflet + tuiles OpenStreetMap.
- Le JS Leaflet est local ; le point de vigilance est le fond de carte distant.
- Verdict : pas besoin d'un CMP complet si vous passez à une activation au clic ; sinon l'absence de mécanisme de consentement devient contestable.

### 5.3 Éventuels outils de mesure d'audience

- Aucun Google Analytics, Matomo, Plausible, Umami, Clarity, pixel Meta, TikTok Pixel ou équivalent n'a été trouvé dans le dépôt.
- Verdict : aucun bandeau requis au titre de la mesure d'audience dans l'état actuel du code.

### 5.4 Éventuels contenus embarqués

- Aucun iframe YouTube, Vimeo, Google Maps, Facebook embed ou widget social n'a été détecté.
- Verdict : très bon point pour rester simple juridiquement.

### 5.5 Éventuels liens ou widgets sociaux

- Présence de liens Facebook simples.
- Absence de bouton "Like", SDK social, module de partage ou social login.
- Verdict : garder des liens simples est la solution la plus propre.

### 5.6 Scripts tiers et CDN

- Aucun script JS chargé depuis un CDN n'a été détecté.
- Les ressources tierces identifiées sont surtout CSS Google Fonts et appels HTTP cartographiques.
- Verdict : le projet est déjà proche d'une base sobre ; il suffit surtout de supprimer les chargements distants non indispensables.

### 5.7 Stockage local côté front

- `sessionStorage` pour cache de hash dans l'espace compte.
- `localStorage` pour étape du wizard mobile.
- Aucun `IndexedDB`, aucun service worker, aucun cache applicatif explicite détecté.
- Verdict : stockage local faible, technique, défendable sans bandeau.

## 6. Verdict clair sur le bandeau cookies

Verdict recommandé dans l'état strict du code actuel :

- Un bandeau cookies général n'est pas justifié par les seuls cookies et stockages internes détectés.
- En revanche, l'affirmation "aucun mécanisme de consentement n'est nécessaire" est trop large tant que des ressources tierces se chargent automatiquement, en particulier Google Fonts et la carte OpenStreetMap.
- Le plus propre n'est pas d'ajouter un gros bandeau CMP, mais de supprimer ou de bloquer avant activation les contenus tiers non nécessaires.

Traduction opérationnelle :

- bandeau non nécessaire pour le cookie PocketBase et les stockages techniques ;
- blocage préalable des contenus tiers recommandé ;
- lien "Gérer mes cookies" non indispensable si vous n'avez pas de traceurs soumis au consentement après nettoyage ;
- une page "Politique cookies et contenus externes" reste utile.

## 7. Recommandation finale

La stratégie la plus adaptée à ce projet associatif est la suivante :

- conserver uniquement les cookies et stockages strictement nécessaires ;
- supprimer les polices Google à distance en auto-hébergeant les fontes ;
- remplacer le chargement automatique de la carte par une activation explicite ou un simple lien sortant ;
- encadrer l'autocomplétion Nominatim par une mention ou un déclenchement plus explicite ;
- interdire ou éviter les images externes directes dans les contenus.

Cette approche est plus simple à maintenir qu'un CMP complet, plus crédible devant des enseignants, et mieux alignée avec un site vitrine associatif sans publicité ni analytics.

## 8. Plan d'action priorisé

### Immédiat

- [ ] Remplacer `@import` Google Fonts par des polices auto-hébergées ou locales.
- [ ] Modifier la carte d'accueil pour qu'aucune requête vers `tile.openstreetmap.org` ne parte avant clic sur "Activer la carte".
- [ ] Ajouter dans la documentation du site que le cookie `pb_auth` est strictement nécessaire à l'espace membre.
- [ ] Vérifier en recette le cookie PocketBase réel dans le navigateur : nom, expiration, `Secure`, `HttpOnly`, `SameSite`.

### Recommandé

- [ ] Ajouter une page ou section "Politique cookies" courte, centrée sur cookies techniques et contenus tiers activés à la demande.
- [ ] Ajouter une mention près de la recherche d'adresse indiquant que la fonctionnalité interroge Nominatim/OpenStreetMap.
- [ ] Déclencher Nominatim après action explicite ou via proxy serveur.
- [ ] Empêcher l'affichage d'images externes arbitraires dans les contenus publics, ou au minimum auditer les enregistrements existants.

### Optionnel

- [ ] Ajouter un lien footer "Contenus externes / cookies techniques".
- [ ] Ajouter un mini registre interne des traceurs et services tiers.
- [ ] Prévoir un composant de consentement contextuel réutilisable si un embed tiers est ajouté plus tard.

## 9. Contenus à rédiger ensuite

- Politique cookies courte :
  expliquer le cookie d'authentification PocketBase et les stockages techniques d'interface.
- Politique "contenus externes" ou section dédiée :
  expliquer les cartes et recherches d'adresse si elles restent présentes.
- Lien footer :
  "Cookies et contenus externes" ou "Vie privée".
- Placeholder de carte :
  bouton "Activer la carte" avec mention du fournisseur tiers.
- Registre interne simple des traceurs :
  un tableau maintenu dans `docs/` suffit pour ce projet.
- Éventuel lien "Gérer mes contenus externes" :
  seulement si vous ajoutez ensuite plusieurs services tiers activables.

## 10. Conclusion

Le projet est proche d'une situation simple et propre : pas d'analytics, pas de pixels, pas de widgets sociaux, pas d'iframes marketing. Le vrai sujet n'est pas le cookie d'authentification, qui est exempté, mais quelques appels tiers automatiques qui peuvent être supprimés ou déclenchés seulement après action utilisateur. Avec ces ajustements, le site peut rester sans bandeau cookies général tout en étant sérieusement défendable.

## Points à vérifier manuellement

- Contrôler dans le navigateur, en environnement de production, le cookie `pb_auth` réellement envoyé par le serveur.
- Vérifier si des enregistrements PocketBase existants contiennent déjà des URLs d'images externes.
- Vérifier si OpenStreetMap/Nominatim déposent effectivement des cookies sur les parcours testés ; le code ne le prouve pas à lui seul.
- Vérifier les headers HTTP finaux en production si Apache ajoute d'autres cookies ou traceurs hors dépôt applicatif.
- Vérifier si une future mise en production ajoute un CDN, un monitoring front, ou un outil d'audience absent du dépôt actuel.

## Décision recommandée pour ce projet

Blocage des services tiers avant consentement suffisant.

Justification : le cookie PocketBase et les stockages locaux détectés sont techniques et exemptés, donc ils ne justifient pas un bandeau global. En revanche, certaines ressources tierces sont encore chargées automatiquement ou quasi automatiquement ; il est plus propre de les supprimer ou de les activer au clic que d'installer une CMP lourde sur tout le site.
