# Système de Changement de Mot de Passe - Documentation Complète

## 📋 Vue d'ensemble

Le système de changement de mot de passe du Kiwanis utilise PocketBase comme backend d'authentification. Ce document explique le fonctionnement complet et les éléments critiques pour que tout fonctionne correctement.

---

## 🔑 Points Critiques à Retenir

### 1. **oldPassword est OBLIGATOIRE**
- PocketBase **exige** le champ `oldPassword` lors d'une mise à jour de mot de passe
- C'est une sécurité : on ne peut changer le mot de passe que si on connaît l'ancien
- Sans ce champ, PocketBase retourne une erreur 400 : `"oldPassword": "Cannot be blank"`

### 2. **Payload STRICT pour changement de mot de passe**
```javascript
// ✅ CORRECT - Uniquement les champs de mot de passe
{
  oldPassword: "ancienMotDePasse",
  password: "nouveauMotDePasse",
  passwordConfirm: "nouveauMotDePasse"
}

// ❌ INCORRECT - Inclure name/email cause des erreurs
{
  name: "User Name",
  email: "user@example.com",
  oldPassword: "ancienMotDePasse",
  password: "nouveauMotDePasse",
  passwordConfirm: "nouveauMotDePasse"
}
```

### 3. **Les mots de passe doivent correspondre**
- `password` et `passwordConfirm` **DOIVENT** être identiques
- Sinon, PocketBase retourne une erreur 400

### 4. **Minimum 8 caractères**
- PocketBase impose une longueur minimum de 8 caractères pour les mots de passe
- Validation côté frontend : `if (newPassword.length < 8)`

---

## 🔄 Flux Complet du Changement de Mot de Passe

### Frontend ([src/pages/mon-compte.astro](../src/pages/mon-compte.astro))

1. **Récupération des données du formulaire**
   ```javascript
   const oldPassword = (formData.get("oldPassword") as string).trim();
   const newPassword = (formData.get("newPassword") as string).trim();
   const newPasswordConfirm = (formData.get("newPasswordConfirm") as string).trim();
   ```

2. **Validation côté client**
   - Vérifier que l'ancien mot de passe est rempli
   - Vérifier que le nouveau mot de passe est rempli
   - Vérifier que le nouveau mot de passe a au moins 8 caractères
   - Vérifier que `newPassword === newPasswordConfirm`

3. **Préparation du payload**
   ```javascript
   const updateData = {
     name: `${firstName} ${lastName}`,
     email: email,
   };
   
   if (newPassword) {
     updateData.oldPassword = oldPassword;
     updateData.password = newPassword;
     updateData.passwordConfirm = newPasswordConfirm;
   }
   ```

4. **Appel de la fonction backend**
   ```javascript
   const result = await updateUserProfile(updateData);
   ```

### Backend ([src/lib/pocketbase.mjs](../src/lib/pocketbase.mjs))

1. **Détection du changement de mot de passe**
   ```javascript
   const hasPasswordChange = !!data.password || !!data.oldPassword;
   ```

2. **Si changement de mot de passe : envoyer UNIQUEMENT les champs de mot de passe**
   ```javascript
   if (hasPasswordChange) {
     const updatePayload = {
       oldPassword: data.oldPassword,
       password: data.password,
       passwordConfirm: data.passwordConfirm,
     };
     
     await pb.collection("users").update(userId, updatePayload);
   }
   ```

3. **Après changement réussi**
   - Effacer la session actuelle : `pb.authStore.clear()`
   - Supprimer le token du localStorage
   - Rediriger vers la page de connexion après 1.5 secondes
   - Retourner `{ passwordChanged: true }`

4. **Si mise à jour simple (sans mot de passe)**
   ```javascript
   const updatePayload = {
     name: data.name,
     email: data.email,
   };
   
   const updatedUser = await pb.collection("users").update(userId, updatePayload);
   pb.authStore.save(pb.authStore.token, updatedUser);
   return updatedUser;
   ```

---

## 🔗 Fichiers Impliqués

| Fichier | Rôle | Points Clés |
|---------|------|------------|
| [src/pages/mon-compte.astro](../src/pages/mon-compte.astro) | Frontend du formulaire | Validation + récupération des données |
| [src/lib/pocketbase.mjs](../src/lib/pocketbase.mjs) | Backend API | Logique d'update + gestion de session |
| pocketbase.io (serveur) | Validation finale | Vérifie oldPassword, format, longueur |

---

## ⚠️ Erreurs Courantes et Solutions

### Erreur 404: "The requested resource wasn't found"
**Cause:** L'ID utilisateur n'existe pas ou la session a expiré
**Solution:** 
- Vérifier que l'utilisateur est bien connecté
- Vérifier que `pb.authStore.record?.id` existe
- Tester dans testback.mjs pour déboguer

### Erreur 400: "Failed to update record"
**Cause:** Généralement `oldPassword` manquant ou incorrect
**Solution:**
- Vérifier que `oldPassword` est fourni
- Vérifier que `password === passwordConfirm`
- Vérifier que le mot de passe fait au moins 8 caractères
- Vérifier l'ancien mot de passe est correct

### Erreur 400: "oldPassword: Cannot be blank"
**Cause:** Le champ `oldPassword` n'est pas envoyé dans le payload
**Solution:** 
- S'assurer que `updatePayload` contient `oldPassword`
- Ne pas envoyer `name` et `email` lors d'un changement de mot de passe

### L'utilisateur n'est pas redirigé après changement
**Cause:** La redirection prend 1.5 secondes, ou le message d'erreur n'apparaît pas
**Solution:**
- Attendre 2 secondes après confirmation
- Vérifier la console pour les erreurs JavaScript

---

## 🧪 Tester le Système

### Avec testback.mjs (Environnement de développement)
```bash
node testback.mjs
# Choisir option 1 pour se connecter
# Choisir option 3 pour tester le changement de mot de passe
```

### Avec testprod.mjs (Environnement de production)
```bash
node testprod.mjs
# Entrer l'email et ancien mot de passe
# Entrer le nouveau mot de passe et confirmer
```

### Sur le site
1. Aller sur `/mon-compte`
2. Remplir le formulaire avec le nouvel email/nom
3. Remplir les champs de mot de passe
4. Cliquer "Enregistrer"
5. Être redirigé vers `/connexion`

---

## 📊 Diagramme du Flux

```
┌─────────────────────────────────────────────────────────────┐
│                     UTILISATEUR                             │
│         (Remplit le formulaire mon-compte.astro)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            VALIDATION FRONTEND (Astro)                       │
│  • Ancien mdp rempli?                                        │
│  • Nouveau mdp rempli?                                       │
│  • Longueur >= 8 caractères?                                 │
│  • password === passwordConfirm?                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         PREPARATION DU PAYLOAD (pocketbase.mjs)             │
│  • Si changement mdp: UNIQUEMENT oldPassword/password        │
│  • Si mise à jour simple: name et email                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         APPEL API POCKETBASE                                │
│  PATCH /api/collections/users/records/{userId}             │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
         ✅ SUCCÈS              ❌ ERREUR 400
              │                     │
              ▼                     ▼
    • Effacer session         Afficher erreur
    • Rediriger vers /connexion
```

---

## 🔐 Considérations de Sécurité

1. **Vérification de l'ancien mot de passe**
   - PocketBase valide automatiquement que `oldPassword` est correct
   - Impossible de changer le mot de passe sans le connaître

2. **Longueur minimum**
   - 8 caractères minimum imposés par PocketBase
   - À renforcer côté client pour UX

3. **Confirmation du mot de passe**
   - Le frontend demande confirmation pour éviter les erreurs
   - PocketBase re-vérifie que `password === passwordConfirm`

4. **Invalidation de session**
   - Après changement, la session actuelle est effacée
   - L'utilisateur doit se reconnecter avec le nouveau mot de passe
   - Prévient les abus si un compte a été compromis

---

## 📝 Résumé des Éléments Importants

✅ **À FAIRE:**
- Inclure `oldPassword` dans le payload
- Vérifier `password === passwordConfirm` 
- Valider longueur >= 8 caractères
- N'envoyer QUE les champs de mot de passe (pas name/email)
- Effacer la session et rediriger après succès

❌ **À NE PAS FAIRE:**
- Envoyer `name` et `email` lors d'un changement de mot de passe
- Oublier `oldPassword`
- Permettre des mots de passe < 8 caractères
- Conserver la session après changement de mot de passe

---

## 🔗 Ressources

- **PocketBase Docs:** https://pocketbase.io/
- **Mon-compte frontend:** [src/pages/mon-compte.astro](../src/pages/mon-compte.astro)
- **Backend API:** [src/lib/pocketbase.mjs](../src/lib/pocketbase.mjs)
- **Tests:** testback.mjs, testprod.mjs
