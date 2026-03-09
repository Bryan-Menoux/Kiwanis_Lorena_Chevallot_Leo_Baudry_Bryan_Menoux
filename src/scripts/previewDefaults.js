// Valeurs par défaut partagées pour la prévisualisation (source unique)
// Modifier uniquement ce fichier pour changer les placeholders côté création + preview.
const placeholderImg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='24'>Image</text></svg>";

const PREVIEW_DEFAULTS = {
  titre: "Titre de l'action ( Exemple: Nettoyage de parc )",
  sous_titre: "Sous-titre d'exemple pour présenter rapidement l'action",
  date_debut: "2026-03-01",
  date_fin: "2026-03-02",
  description_hero: "Une courte description de l'image hero.",
  hero: placeholderImg,
  titre_partie_1: "Contexte et objectifs",
  texte_partie_1:
    "Présentez le contexte de l'action et expliquez les objectifs que vous soutiez atteindre",
  photo_partie_1: placeholderImg,
  description_photo_partie_1: "Description de la photo",
  nom_lieu: "Salle communautaire Exemple",
  adresse_lieu: "12 rue Exemple, 75000 Ville",
  lien_lieu: "https://maps.google.com/",
  chiffre: "150",
  type_action: [],
  // ne pas prioriser : valeur vide par défaut - la liste des options est fournie
  type_de_chiffre: "",
  beneficiaire: "Association Exemple",
  titre_partie_2: "Déroulement de l'action",
  texte_partie_2:
    "Décrivez le déroulement de l'évènement en détail. \n ex: ce qu'on fait les bénévoles, les étapes clés, les moments forts...",
  photo_partie_2: placeholderImg,
  description_photo_partie_2: "Description de la photo",
  titre_partie_3: "Résultats et impacts",
  texte_partie_3:
    "Indiquez les résultats obtenus et les impacts de l'action. \n ex: ce qui a été accompli, les retours des bénéficiaires, les enseignements pour l'avenir...",
  photo_partie_3: placeholderImg,
  description_photo_partie_3: "Description de la photo",
  titre_remerciements: "Remerciements",
  description_remerciements: "Merci aux bénévoles et partenaires.",
  galerie_photos: [placeholderImg, placeholderImg, placeholderImg],
};

export default PREVIEW_DEFAULTS;

