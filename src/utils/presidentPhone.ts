import {
  Collections,
  MembresRoleOptions,
  type MembresResponse,
  type UsersResponse,
} from "../pocketbase-types";

export async function getPresidentPhoneNumber(pocketbaseClient: any) {
  try {
    const president = await pocketbaseClient
      .collection(Collections.Membres)
      .getFirstListItem<MembresResponse>(
        `role = "${MembresRoleOptions.président}" || role = "${MembresRoleOptions.présidente}"`,
        { expand: "utilisateur" },
      );

    if (!president?.utilisateur) return null;

    const expandedUser = (president as any)?.expand?.utilisateur;
    if (
      expandedUser &&
      typeof expandedUser === "object" &&
      typeof expandedUser.numero_telephone === "string" &&
      expandedUser.numero_telephone.trim() !== ""
    ) {
      return expandedUser.numero_telephone;
    }

    try {
      const user = await pocketbaseClient
        .collection(Collections.Users)
        .getOne<UsersResponse>(String(president.utilisateur));

      if (typeof user?.numero_telephone === "string" && user.numero_telephone.trim() !== "") {
        return user.numero_telephone;
      }
    } catch (error: any) {
      if (error?.status !== 404) {
        console.error("Erreur lors de la récupération du numéro du président:", error);
      }
    }
  } catch (error: any) {
    if (error?.status !== 404) {
      console.error("Erreur lors de la récupération du numéro du président:", error);
    }
  }

  return null;
}

