# Résumé des fonctions de pocketbase.mjs

Ce document résume toutes les fonctions exportées du module `pocketbase.mjs`, qui gère l'interaction avec la base de données PocketBase pour l'application Kiwanis.

## Fonctions exportées

### `getPbServerInstance()`
- **Description** : Crée une instance PocketBase côté serveur avec authentification admin
- **Utilisation** : Nécessaire pour les opérations serveur qui requièrent des droits élevés
- **Authentification** : Utilise la collection spéciale '_superusers' avec les variables d'environnement `POCKETBASE_ADMIN_EMAIL` et `POCKETBASE_ADMIN_PASSWORD`
- **Retour** : Instance PocketBase authentifiée en tant que super utilisateur

### `createUser(data)`
- **Description** : Crée un nouvel utilisateur dans la collection 'users' par défaut de PocketBase
- **Paramètres** : `data` - objet contenant les données de l'utilisateur
- **Retour** : L'utilisateur nouvellement créé

### `authenticateUser(email, password)`
- **Description** : Authentifie un utilisateur et vérifie automatiquement le champ 'verified'
- **Vérifications** :
  - Authentification via `authWithPassword()`
  - Vérification du statut 'verified' (validation par admin)
  - Nettoyage du store si non vérifié
- **Retour** : Données d'authentification ou erreur si non vérifié
- **Gestion d'erreurs** : Messages spécifiques pour identifiants incorrects

### `isUserAuthenticated()`
- **Description** : Vérifie si l'utilisateur est authentifié en utilisant le authStore de PocketBase
- **Retour** : Booléen indiquant si l'utilisateur est valide et a un ID

### `updateUserProfile(data)`
- **Description** : Met à jour le profil utilisateur via une API personnalisée
- **Fonctionnalités** :
  - Mise à jour du nom
  - Changement de mot de passe (nécessite oldPassword, password, passwordConfirm)
  - Gestion automatique de la déconnexion après changement de mot de passe
- **Authentification** : Utilise le token JWT du store PocketBase
- **Retour** : Utilisateur mis à jour ou objet indiquant changement de mot de passe

### `getCurrentUser()`
- **Description** : Récupère l'utilisateur actuel depuis le authStore
- **Ajout spécial** : Propriété 'nameParts' pour faciliter l'affichage (division du nom complet)
- **Retour** : Utilisateur avec nameParts ou undefined si non connecté

### `getUserData()`
- **Description** : Récupère les données complètes de l'utilisateur depuis le cache authStore
- **Note** : Utilise UNIQUEMENT les données mises en cache pour éviter les erreurs 403 Forbidden
- **Retour** : Données utilisateur du cache ou null

### `logoutUser()`
- **Description** : Déconnecte l'utilisateur en nettoyant le store d'authentification et le localStorage
- **Actions** :
  - Nettoyage du authStore PocketBase
  - Suppression de 'pocketbase_auth' du localStorage

### `isUserAdmin()`
- **Description** : Vérifie si l'utilisateur est administrateur via le champ 'administrateur'
- **Vérifications** :
  - Authentification requise
  - Champ 'administrateur' === true dans le cache
- **Retour** : Booléen indiquant le statut admin

### `getUnverifiedUsers()`
- **Description** : Récupère les utilisateurs non vérifiés et non rejetés
- **Authentification** : Nécessite droits super utilisateur
- **Filtre** : `verified = false && rejected != true`
- **Tri** : Par date de création décroissante
- **Retour** : Liste des utilisateurs en attente

### `verifyUser(userId)`
- **Description** : Vérifie un utilisateur (réservé aux admins vérifiés)
- **Vérifications** :
  - Utilisateur actuel doit être admin ET verified
  - Authentification super utilisateur requise
- **Action** : Met à jour le champ 'verified' à true
- **Retour** : Utilisateur mis à jour

### `rejectUser(userId)`
- **Description** : Rejette un utilisateur en le supprimant définitivement (réservé aux admins)
- **Vérifications** :
  - Authentification et droits admin requis
  - Authentification super utilisateur
- **Action** : Suppression définitive via `delete()`
- **Retour** : true si succès

### `getRejectedUsers()`
- **Description** : Récupère les utilisateurs marqués comme rejetés
- **Authentification** : Droits super utilisateur requis
- **Filtre** : `rejected = true`
- **Tri** : Par date de rejet décroissante
- **Retour** : Liste des utilisateurs rejetés

### `deleteAllRejectedUsers()`
- **Description** : Supprime tous les utilisateurs rejetés en masse
- **Authentification** : Droits super utilisateur requis
- **Gestion d'erreurs** : Suppression individuelle avec continuation en cas d'erreur
- **Retour** : Objet avec `success: true` et nombre d'utilisateurs supprimés

## Instance principale

### `pb`
- **Description** : Instance principale de PocketBase pour le client
- **Configuration** : URL automatique selon l'environnement (dev/prod, browser/server)
- **Fonctionnalités** : Gestion automatique de l'authentification et du stockage local

---

## Analyse d'utilisation dans Verification-Account-section.astro

### Fonctions utilisées dans le composant

### `pb` (instance principale)
- **Utilisation** : ✅ **UTILISÉ** (indirectement via les fonctions API)
- **Détails** : L'instance `pb` est utilisée dans les fonctions de `pocketbase.mjs` pour récupérer le token d'authentification (`pb.authStore.token`) dans tous les appels API
- **Emplacements dans les fonctions** :
  - `fetchCSRFToken()` : ligne ~468
  - `fetchUnverifiedUsers()` : ligne ~485
  - `fetchVerifiedUsers()` : ligne ~502
  - `fetchRejectedUsers()` : ligne ~519
  - `fetchUserFullData()` : ligne ~536
  - `verifyUserAction()` : ligne ~553
  - `deleteAllRejectedUsersAPI()` : ligne ~577

### Fonctions NON utilisées dans le composant

#### `getPbServerInstance()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant fonctionne côté client et utilise des appels API fetch au lieu d'instances serveur

#### `createUser(data)`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : La création d'utilisateurs se fait probablement via d'autres composants/pages

#### `authenticateUser(email, password)`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : L'authentification se fait probablement dans la page de connexion séparée

#### `isUserAuthenticated()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise une vérification manuelle via `pb.authStore.token` et des appels API

#### `updateUserProfile(data)`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : La mise à jour de profil se fait probablement dans d'autres composants

#### `getCurrentUser()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant récupère les données utilisateur via l'API `/api/get-user-full`

#### `getUserData()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API serveur au lieu du cache local

#### `logoutUser()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : La déconnexion se fait probablement dans d'autres composants

#### `isUserAdmin()`
- **Utilisation** : ❌ **NON UTILISÉ** (supprimé lors du nettoyage)
- **Raison** : Le composant vérifie les droits admin via l'API `/api/get-user-full` qui retourne `user.administrateur`

#### `getUnverifiedUsers()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API `/api/unverified-users` au lieu de la fonction directe

#### `verifyUser(userId)`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API `/api/verify-user` pour les actions de vérification/rejet

#### `rejectUser(userId)`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API `/api/verify-user` avec action "reject"

#### `getRejectedUsers()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API `/api/rejected-users`

#### `deleteAllRejectedUsers()`
- **Utilisation** : ❌ **NON UTILISÉ**
- **Raison** : Le composant utilise l'API `/api/delete-rejected-users`

---

## Nouvelles fonctions ajoutées (API wrappers)

Ces fonctions ont été créées pour encapsuler les appels API utilisés dans `Verification-Account-section.astro` :

### `fetchCSRFToken()`
- **Description** : Récupère un token CSRF sécurisé depuis l'endpoint `/api/csrf-token`
- **Authentification** : Utilise le token Bearer du store PocketBase
- **Retour** : Token CSRF

### `fetchUnverifiedUsers()`
- **Description** : Récupère les utilisateurs non vérifiés via l'API `/api/unverified-users`
- **Retour** : Array des utilisateurs en attente

### `fetchVerifiedUsers()`
- **Description** : Récupère les utilisateurs vérifiés via l'API `/api/verified-users`
- **Retour** : Array des utilisateurs vérifiés

### `fetchRejectedUsers()`
- **Description** : Récupère les utilisateurs rejetés via l'API `/api/rejected-users`
- **Retour** : Array des utilisateurs rejetés

### `fetchUserFullData(userId)`
- **Description** : Récupère les données complètes d'un utilisateur via `/api/get-user-full`
- **Paramètres** : `userId` - ID de l'utilisateur
- **Retour** : Objet utilisateur complet

### `verifyUserAction(userId, action, csrfToken)`
- **Description** : Effectue une action de vérification/rejet via `/api/verify-user`
- **Paramètres** :
  - `userId` - ID de l'utilisateur
  - `action` - Action à effectuer ("verify", "reject", "reset")
  - `csrfToken` - Token CSRF pour la sécurité
- **Retour** : Utilisateur mis à jour

### `deleteAllRejectedUsersAPI(csrfToken)`
- **Description** : Supprime tous les utilisateurs rejetés via `/api/delete-rejected-users`
- **Paramètres** : `csrfToken` - Token CSRF requis
- **Retour** : Résultat de l'opération avec nombre d'utilisateurs supprimés

### Pattern d'utilisation général

Le composant `Verification-Account-section.astro` suit un pattern où :
- Il utilise **uniquement** l'instance `pb` pour récupérer le token d'authentification
- Toutes les opérations de base de données se font via des **appels API fetch** vers des endpoints `/api/*`
- Cela permet une **séparation claire** entre logique client et serveur
- Les fonctions de `pocketbase.mjs` sont principalement utilisées dans d'autres composants/pages pour des opérations plus simples

**Note** : De nouvelles fonctions wrapper ont été ajoutées à `pocketbase.mjs` pour encapsuler ces appels API, permettant une utilisation plus propre et réutilisable de cette logique dans d'autres composants.

**Mise à jour récente** : Le composant `Verification-Account-section.astro` a été refactorisé pour utiliser exclusivement les fonctions de `pocketbase.mjs` au lieu des appels fetch directs. Toutes les opérations API passent maintenant par les fonctions wrapper centralisées.</content>
<parameter name="filePath">d:\Github\Kiwanis_Lorena_Chevallot_Leo_Baudry_Bryan_Menoux\docs\pocketbase-functions-summary.md