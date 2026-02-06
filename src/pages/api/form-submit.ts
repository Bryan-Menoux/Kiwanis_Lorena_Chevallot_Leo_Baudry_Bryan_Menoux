import type { APIRoute } from 'astro';
import { capitalizeName } from '../../utils/utilitaires.js';

export const POST: APIRoute = async ({ locals, request }) => {
  if (request.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400 });
  }

  if (!locals.pb.authStore.isValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const currentUser = locals.pb.authStore.model;
  if (!currentUser || !currentUser.verified) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const data = await request.json();
    const { formType, ...formData } = data;

    switch (formType) {
      case 'profile':
        // Mise à jour du profil utilisateur
        const { firstName = '', lastName = '', email = '', oldPassword, newPassword, newPasswordConfirm } = formData;
        
        const name = `${firstName} ${lastName}`.trim();
        const capitalizedName = capitalizeName(name);

        if (oldPassword || newPassword || newPasswordConfirm) {
          if (newPassword !== newPasswordConfirm) {
            return new Response(
              JSON.stringify({ success: false, error: 'Les mots de passe ne correspondent pas' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        const updateData: any = {};
        if (capitalizedName) updateData.name = capitalizedName;
        if (email) updateData.email = email;
        if (oldPassword && newPassword) {
          updateData.oldPassword = oldPassword;
          updateData.password = newPassword;
          updateData.passwordConfirm = newPasswordConfirm;
        }

        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Aucune modification' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await locals.pb.collection("users").update(currentUser.id, updateData);

        return new Response(
          JSON.stringify({ 
            success: true, 
            name: capitalizedName, 
            email: updateData.email || currentUser.email,
            message: 'Profil mis à jour avec succès'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'verification':
        // Actions d'administration
        const { userId, action } = formData;
        
        if (!userId || !action) {
          return new Response(
            JSON.stringify({ success: false, error: 'Données manquantes' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!currentUser.administrateur) {
          return new Response(
            JSON.stringify({ success: false, error: 'Non autorisé' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        switch (action) {
          case 'approve':
            await locals.pb.collection("users").update(userId, {
              verified: true,
              rejected: false,
              rejectionDate: null,
              rejectedBy: null,
            });
            break;
          case 'reject':
            const now = new Date().toISOString();
            await locals.pb.collection("users").update(userId, {
              verified: false,
              rejected: true,
              rejectionDate: now,
              rejectedBy: currentUser.id,
            });
            break;
          case 'unreject':
            await locals.pb.collection("users").update(userId, {
              verified: false,
              rejected: false,
              rejectionDate: null,
              rejectedBy: null,
            });
            break;
          case 'unverify':
            await locals.pb.collection("users").update(userId, {
              verified: false,
              rejected: false,
              rejectionDate: null,
              rejectedBy: null,
            });
            break;
          default:
            return new Response(
              JSON.stringify({ success: false, error: 'Action inconnue' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            action,
            userId,
            message: `Action ${action} effectuée avec succès`
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'modification':
        // Modification des infos d'un autre utilisateur
        const { userId: modUserId, name: modName, email: modEmail } = formData;
        
        if (!currentUser.administrateur) {
          return new Response(
            JSON.stringify({ success: false, error: 'Non autorisé' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const capitalizedModName = capitalizeName(modName);
        await locals.pb.collection("users").update(modUserId, { 
          name: capitalizedModName, 
          email: modEmail 
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            name: capitalizedModName,
            email: modEmail,
            message: 'Utilisateur modifié avec succès'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Type de formulaire inconnu' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Erreur lors du traitement du formulaire:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
