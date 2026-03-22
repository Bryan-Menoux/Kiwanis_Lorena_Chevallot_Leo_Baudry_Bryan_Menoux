import type { APIRoute } from "astro";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatPhone(phone: any) {
  if (!phone) return "";
  let str = String(phone).replace(/\D/g, "");
  if (!str.startsWith("0")) str = "0" + str;
  str = str.slice(0, 10);
  return str.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { prenom, nom, email, telephone, message, photos, id, collectionId } =
      data;

    const formattedPhone = formatPhone(telephone);

    const files = await Promise.all(
      (photos || []).map(async (file: string, index: number) => {
        const url = `${process.env.POCKETBASE_URL}/api/files/${collectionId}/${id}/${file}`;

        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Impossible de récupérer ${file}: ${res.status}`);

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

    const inlineAttachments = files.map(
      ({ file, index, contentType, base64 }) => ({
        filename: file,
        content: base64,
        contentType,
        contentId: `image_${index}`,
      }),
    );

    const regularAttachments = files.map(({ file, contentType, base64 }) => ({
      filename: file,
      content: base64,
      contentType,
    }));

    const allAttachments = [...inlineAttachments, ...regularAttachments];

    const imagesHtml = (() => {
      const list = photos || [];
      if (!list.length) return "";

      const rows: string[] = [];
      for (let i = 0; i < list.length; i += 2) {
        const cell = (index: number) =>
          index < list.length
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

    const baseStyle = `font-family:Arial,sans-serif;background:#f4f6f8;padding:20px;`;
    const cardStyle = `max-width:600px;margin:auto;background:white;border-radius:12px;padding:20px;box-shadow:0 5px 20px rgba(0,0,0,0.08);`;
    const photosBlock = photos?.length
      ? `<h3 style="margin-top:20px;">Images</h3>${imagesHtml}`
      : "";

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
        ${photos?.length ? `<h3 style="margin-top:20px;">Vos images</h3>${imagesHtml}` : ""}
        <p style="margin-top:20px;color:#888;">— L'équipe Kiwanis</p>
      </div></div>`;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: ["support.kiwanis.pays.montbeliard@gmail.com"],
      subject: `Nouveau message de ${prenom} ${nom}`,
      html: adminHtml,
      attachments: allAttachments,
    });

    await resend.emails.send({
      from: "contact@bryan-menoux.fr",
      to: [email],
      subject: "Nous avons bien reçu votre message",
      html: userHtml,
      attachments: allAttachments,
    });

    return new Response("OK");
  } catch (error) {
    console.error("❌ ERREUR EMAIL:", error);
    return new Response("Erreur serveur", { status: 500 });
  }
};
