import type { APIRoute } from 'astro';
import { capitalizeName } from '../../utils/utilitaires.js';
import { nowIso } from '../../utils/utilitaires.js';
import {
  Collections,
  MembresRoleOptions,
  UsersGenreOptions,
  type MembresResponse,
  type UsersResponse,
} from '../../pocketbase-types';

export const POST: APIRoute = async ({ locals, request }) => {
  if (request.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400 });
  }

  if (!locals.pb.authStore.isValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const currentUser = locals.pb.authStore.record;
  if (!currentUser || !currentUser.verified) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const getAvatarFileName = (value: unknown) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return String(value[0] || "");
    return "";
  };

  const getMemberDisplayName = (user: Pick<UsersResponse, "name" | "email">) => {
    const name = String(user.name || "").trim();
    if (name.length > 0) {
      return capitalizeName(name);
    }
    return String(user.email || "").trim() || "Membre Kiwanis";
  };

  const getMemberUser = async (memberUserId: string) =>
    locals.pb.collection(Collections.Users).getOne<UsersResponse>(memberUserId);

  const findExistingMemberRecord = async (memberUserId: string) => {
    try {
      return await locals.pb
        .collection(Collections.Membres)
        .getFirstListItem<MembresResponse>(`utilisateur = "${memberUserId}"`);
    } catch (error: any) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    // Compatibilite anciens enregistrements: nom contenait l'id utilisateur.
    try {
      return await locals.pb
        .collection(Collections.Membres)
        .getFirstListItem<MembresResponse>(`nom = "${memberUserId}"`);
    } catch (error: any) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    return null;
  };

  const saveMemberRecord = async (
    existingRecordId: string | null,
    payload: Record<string, unknown>,
  ) => {
    if (existingRecordId) {
      await locals.pb.collection(Collections.Membres).update(existingRecordId, payload);
    } else {
      await locals.pb.collection(Collections.Membres).create(payload);
    }
  };

  const downloadAvatarFileForMember = async (memberUser: UsersResponse) => {
    const sourceAvatarFileName = getAvatarFileName(memberUser.avatar);
    if (!sourceAvatarFileName) {
      return { sourceAvatarFileName: "", avatarFile: null as File | null };
    }

    const authToken = locals.pb.authStore.token;
    const tryFetchAvatar = async (url: string) => {
      const response = await fetch(url, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      if (!response.ok) {
        return null;
      }

      const avatarBlob = await response.blob();
      return new File(
        [avatarBlob],
        sourceAvatarFileName,
        { type: avatarBlob.type || "application/octet-stream" },
      );
    };

    let avatarFile = await tryFetchAvatar(
      locals.pb.files.getURL(memberUser, sourceAvatarFileName),
    );

    if (!avatarFile) {
      try {
        const fileToken = await locals.pb.files.getToken();
        avatarFile = await tryFetchAvatar(
          locals.pb.files.getURL(memberUser, sourceAvatarFileName, { token: fileToken }),
        );
      } catch {
        // Rien à faire : on conservera l'avatar existant côté membres.
      }
    }

    return { sourceAvatarFileName, avatarFile };
  };

  const upsertMemberRecord = async (
    memberUserId: string,
    role: MembresRoleOptions,
  ) => {
    const memberUser = await getMemberUser(memberUserId);
    const existingRecord = await findExistingMemberRecord(memberUserId);
    const { sourceAvatarFileName, avatarFile } = await downloadAvatarFileForMember(memberUser);

    const memberPayload: Record<string, unknown> = {
      utilisateur: memberUser.id,
      nom: getMemberDisplayName(memberUser),
      role,
    };

    if (avatarFile) {
      memberPayload.avatar = avatarFile;
    } else if (!sourceAvatarFileName) {
      memberPayload.avatar = null;
    }

    await saveMemberRecord(existingRecord?.id ?? null, memberPayload);
  };

  const ensureMemberRecord = async (memberUserId: string) => {
    await upsertMemberRecord(memberUserId, MembresRoleOptions.membre);
  };

  const removeMemberRecords = async (memberUserId: string) => {
    const memberRows = await locals.pb
      .collection(Collections.Membres)
      .getFullList<MembresResponse>({
        filter: `utilisateur = "${memberUserId}" || nom = "${memberUserId}"`,
      });

    await Promise.all(
      memberRows.map((row) =>
        locals.pb.collection(Collections.Membres).delete(row.id),
      ),
    );
  };

  try {
    const data = await request.json();
    const { formType, ...formData } = data;

    switch (formType) {
      case 'profile':
        // Mise à jour du profil utilisateur
        const {
          firstName = '',
          lastName = '',
          email = '',
          oldPassword,
          newPassword,
          newPasswordConfirm,
          genre,
        } = formData;
        
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
        if (email && email.trim()) {
          // Seul un admin peut modifier l'email
          if (!currentUser.administrateur) {
            return new Response(
              JSON.stringify({ success: false, error: 'Seul un administrateur peut modifier l\'adresse e-mail' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
          updateData.email = email.trim();
        }
        if (oldPassword && newPassword) {
          updateData.oldPassword = oldPassword;
          updateData.password = newPassword;
          updateData.passwordConfirm = newPasswordConfirm;
        }
        if (genre === UsersGenreOptions.homme || genre === UsersGenreOptions.femme) {
          updateData.genre = genre;
        }

        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Aucune modification' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Vérifier si l'email ou le mot de passe a changé
        const emailChanged = email && email.trim() !== currentUser.email;
        const passwordChanged = oldPassword && newPassword;

        await locals.pb.collection("users").update(currentUser.id, updateData);

        try {
          const existingMember = await findExistingMemberRecord(currentUser.id);
          if (existingMember) {
            await upsertMemberRecord(
              currentUser.id,
              existingMember.role || MembresRoleOptions.membre,
            );
          }
        } catch (memberSyncError) {
          console.error("Impossible de synchroniser le membre après mise à jour du profil:", memberSyncError);
        }

        // Si l'email ou le mot de passe a changé, déconnecter l'utilisateur
        const shouldLogout = emailChanged || passwordChanged;
        if (shouldLogout) {
          locals.pb.authStore.clear();
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            name: capitalizedName, 
            email: updateData.email || currentUser.email,
            message: 'Profil mis à jour avec succès',
            logout: shouldLogout
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
            await ensureMemberRecord(userId);
            break;
          case 'reject':
            const now = nowIso();
            await locals.pb.collection("users").update(userId, {
              verified: false,
              administrateur: false,
              rejected: true,
              rejectionDate: now,
              rejectedBy: currentUser.id,
            });
            await removeMemberRecords(userId);
            break;
          case 'unreject':
            await locals.pb.collection("users").update(userId, {
              verified: false,
              administrateur: false,
              rejected: false,
              rejectionDate: null,
              rejectedBy: null,
            });
            await removeMemberRecords(userId);
            break;
          case 'unverify':
            await locals.pb.collection("users").update(userId, {
              verified: false,
              administrateur: false,
              rejected: false,
              rejectionDate: null,
              rejectedBy: null,
            });
            await removeMemberRecords(userId);
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
        const { userId: modUserId, name: modName, email: modEmail, admin: modAdmin } = formData;
        
        if (!currentUser.administrateur) {
          return new Response(
            JSON.stringify({ success: false, error: 'Non autorisé' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const capitalizedModName = capitalizeName(modName);
        const updateDataMod: any = {
          name: capitalizedModName, 
          email: modEmail
        };
        
        // Ajouter le champ administrateur s'il est fourni
        if (modAdmin !== undefined) {
          updateDataMod.administrateur = modAdmin;
        }
        
        await locals.pb.collection("users").update(modUserId, updateDataMod);

        try {
          const existingMember = await findExistingMemberRecord(modUserId);
          if (existingMember) {
            await upsertMemberRecord(
              modUserId,
              existingMember.role || MembresRoleOptions.membre,
            );
          }
        } catch (memberSyncError) {
          console.error("Impossible de synchroniser le membre après modification admin:", memberSyncError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            name: capitalizedModName,
            email: modEmail,
            administrateur: modAdmin,
            message: 'Utilisateur modifié avec succès'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'handover':
        // Transmission du rôle de directeur/directrice
        const { targetUserId } = formData;
        let currentRoleValue: unknown = (currentUser as any)?.role;
        try {
          try {
            const currentMember = await locals.pb
              .collection(Collections.Membres)
              .getFirstListItem<MembresResponse>(`utilisateur = "${currentUser.id}"`);
            currentRoleValue = currentMember?.role ?? currentRoleValue;
          } catch {
            const legacyMember = await locals.pb
              .collection(Collections.Membres)
              .getFirstListItem<MembresResponse>(`nom = "${currentUser.id}"`);
            currentRoleValue = legacyMember?.role ?? currentRoleValue;
          }
        } catch {
          // Aucun enregistrement membre lié : on conserve le rôle utilisateur.
        }

        const currentRole = String(currentRoleValue || "").trim().toLowerCase();
        const isPresidentOrPresidente = [
          "président",
          "présidente",
          "president",
          "presidente",
        ].includes(currentRole);

        if (!isPresidentOrPresidente || !currentUser.administrateur) {
          return new Response(
            JSON.stringify({ success: false, error: 'Non autorisé' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!targetUserId || typeof targetUserId !== 'string') {
          return new Response(
            JSON.stringify({ success: false, error: 'Utilisateur cible invalide' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (targetUserId === currentUser.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Vous êtes déjà directeur/directrice' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const targetUser = await locals.pb.collection("users").getOne(targetUserId);

        if (!targetUser || targetUser.verified !== true || targetUser.rejected === true) {
          return new Response(
            JSON.stringify({ success: false, error: 'La transmission est possible uniquement vers un membre vérifié et non rejeté' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (targetUser.administrateur !== true) {
          await locals.pb.collection("users").update(targetUserId, {
            administrateur: true,
          });
        }

        const targetMemberRole =
          targetUser.genre === UsersGenreOptions.femme
            ? ("présidente" as MembresRoleOptions)
            : ("président" as MembresRoleOptions);

        // La personne visée devient président/présidente selon son genre.
        await upsertMemberRecord(targetUserId, targetMemberRole);

        // L'utilisateur qui transmet conserve les droits admin,
        // mais repasse au rôle "membre" dans la collection membres.
        await ensureMemberRecord(currentUser.id);

        return new Response(
          JSON.stringify({
            success: true,
            targetUserId,
            message: 'Transmission de direction effectuée avec succès. Vous restez administrateur.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'deletion':
        // Suppression d'un utilisateur
        const { userId: deleteUserId } = formData;
        
        if (!deleteUserId) {
          return new Response(
            JSON.stringify({ success: false, error: 'ID utilisateur manquant' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!currentUser.administrateur) {
          return new Response(
            JSON.stringify({ success: false, error: 'Non autorisé' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Empêcher la suppression de soi-même
        if (deleteUserId === currentUser.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Vous ne pouvez pas vous supprimer vous-même' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await removeMemberRecords(deleteUserId);
        await locals.pb.collection("users").delete(deleteUserId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Utilisateur supprimé avec succès'
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

