import { Resend } from "resend";

const getEnvValue = (key: string) => {
  const viteEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env[key] === "string"
      ? import.meta.env[key]
      : "";
  const processEnv =
    typeof process !== "undefined" &&
    process.env &&
    typeof process.env[key] === "string"
      ? process.env[key]
      : "";

  return (viteEnv || processEnv || "").trim();
};

const getResendClient = () => {
  const apiKey = getEnvValue("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquante.");
  }
  return new Resend(apiKey);
};

const adminRecipients = (
  getEnvValue("CONTACT_FORM_SEND_TO") ||
  getEnvValue("SEND_TO") ||
  "support.kiwanis.pays.montbeliard@gmail.com"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const adminFromAddress =
  getEnvValue("CONTACT_FORM_FROM") ||
  getEnvValue("RESEND_FROM") ||
  "onboarding@resend.dev";

const userFromAddress =
  getEnvValue("CONTACT_FORM_REPLY_FROM") ||
  getEnvValue("RESEND_REPLY_FROM") ||
  "contact@kiwanis-pays-de-montbeliard.fr";

function formatPhone(phone: unknown) {
  if (!phone) return "";
  let str = String(phone).replace(/\D/g, "");
  if (!str.startsWith("0")) str = "0" + str;
  str = str.slice(0, 10);
  return str.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export interface ContactMailPayload {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  message?: string;
  photos?: string[];
  id?: string;
  collectionId?: string;
}

export async function sendContactEmails(data: ContactMailPayload) {
  if (adminRecipients.length === 0) {
    throw new Error("Aucun destinataire configuré pour CONTACT_FORM_SEND_TO.");
  }
  const resend = getResendClient();

  const {
    prenom = "",
    nom = "",
    email = "",
    telephone = "",
    message = "",
    photos = [],
    id = "",
    collectionId = "",
  } = data;

  const formattedPhone = formatPhone(telephone);

  const files = await Promise.all(
    (photos || []).map(async (file: string, index: number) => {
      const pocketbaseUrl = getEnvValue("POCKETBASE_URL");
      if (!pocketbaseUrl) {
        throw new Error("POCKETBASE_URL manquante.");
      }
      const url = `${pocketbaseUrl}/api/files/${collectionId}/${id}/${file}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Impossible de récupérer ${file}: ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      const ext = file.split(".").pop()?.toLowerCase();
      let contentType = "image/jpeg";
      if (ext === "png") contentType = "image/png";
      if (ext === "webp") contentType = "image/webp";

      return {
        file,
        index,
        contentType,
        base64: Buffer.from(buffer).toString("base64"),
      };
    }),
  );

  const inlineAttachments = files.map(({ file, index, contentType, base64 }) => ({
    filename: file,
    content: base64,
    contentType,
    contentId: `image_${index}`,
  }));

  const regularAttachments = files.map(({ file, contentType, base64 }) => ({
    filename: file,
    content: base64,
    contentType,
  }));

  const allAttachments = [...inlineAttachments, ...regularAttachments];

  const imagesHtml = (() => {
    if (!photos.length) return "";

    const rows: string[] = [];
    for (let i = 0; i < photos.length; i += 2) {
      const cell = (index: number) =>
        index < photos.length
          ? `<td width="50%" style="padding:4px;vertical-align:top;">
                <img src="cid:image_${index}" width="100%" height="180" style="border-radius:8px;display:block;object-fit:cover;" />
             </td>`
          : `<td width="50%" style="padding:4px;"></td>`;

      rows.push(`<tr>${cell(i)}${cell(i + 1)}</tr>`);
    }

    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      ${rows.join("")}
    </table>`;
  })();

  const baseStyle = "font-family:Arial,sans-serif;background:#f4f6f8;padding:20px;";
  const cardStyle =
    "max-width:600px;margin:auto;background:white;border-radius:12px;padding:20px;box-shadow:0 5px 20px rgba(0,0,0,0.08);";
  const photosBlock = photos.length ? `<h3 style="margin-top:20px;">Images</h3>${imagesHtml}` : "";

  const adminHtml = `
    <div style="${baseStyle}"><div style="${cardStyle}">
      <h2 style="color:#1e3c71;">Nouveau message</h2>
      <p><strong>${prenom} ${nom}</strong></p>
      <p>${email}</p>
      <p>${formattedPhone}</p>
      <hr style="margin:20px 0;" />
      <div style="background:#f5f5f5;padding:15px;border-radius:8px;">${message}</div>
      ${photosBlock}
    </div></div>`;

  const userHtml = `
    <div style="${baseStyle}"><div style="${cardStyle}">
      <h2 style="color:#1e3c71;">Merci pour votre message 🙌</h2>
      <p>Bonjour ${prenom},</p>
      <p>Nous avons bien reçu votre message et nous vous répondrons rapidement.</p>
      <hr style="margin:20px 0;" />
      <div style="background:#f5f5f5;padding:15px;border-radius:8px;">${message}</div>
      ${photos.length ? `<h3 style="margin-top:20px;">Vos images</h3>${imagesHtml}` : ""}
      <p style="margin-top:20px;color:#888;">— L'équipe Kiwanis</p>
    </div></div>`;

  await resend.emails.send({
    from: adminFromAddress,
    to: adminRecipients,
    subject: `Nouveau message de ${prenom} ${nom}`,
    html: adminHtml,
    attachments: allAttachments,
  });

  if (email) {
    await resend.emails.send({
      from: userFromAddress,
      to: [email],
      subject: "Nous avons bien reçu votre message",
      html: userHtml,
      attachments: allAttachments,
    });
  }
}
