import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "jobsy.lv <noreply@jobsy.lv>";

// Generic send — used by auth-router for password reset etc.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPostPublished(
  to: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    const safeTitle = escHtml(postTitle);
    const safeUrl = escHtml(postUrl);
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tavs sludinājums ir publicēts! 🎉",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Tavs sludinājums ir publicēts!</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${safeTitle}</strong> tagad ir redzams visiem jobsy.lv apmeklētājiem. Sludinājums būs aktīvs 30 dienas.
          </p>
          <a href="${safeUrl}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendPostPublished failed:", err);
  }
}

export async function sendInterestNotification(
  to: string,
  helperName: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    const safeName = escHtml(helperName);
    const safeTitle = escHtml(postTitle);
    const safeUrl = escHtml(postUrl);
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${safeName} ir ieinteresēts tavā sludinājumā! 👋`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Kāds ir ieinteresēts!</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${safeName}</strong> ir ieinteresēts tavā sludinājumā <strong>${safeTitle}</strong>. Apskata sludinājumu, lai sazinātos.
          </p>
          <a href="${safeUrl}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendInterestNotification failed:", err);
  }
}

export async function sendSearchAlert(
  to: string,
  label: string,
  posts: Array<{ id: number; title: string; city: string | null }>
): Promise<void> {
  try {
    const rows = posts
      .map((p) => {
        const safeTitle = escHtml(p.title);
        const safeCity = p.city ? escHtml(p.city) : "";
        const url = `https://jobsy.lv/post/${p.id}`;
        return `<li style="margin-bottom:12px;"><a href="${url}" style="color:#E8512A;font-weight:bold;text-decoration:none;">${safeTitle}</a>${safeCity ? ` <span style="color:#8A7060;">— ${safeCity}</span>` : ""}</li>`;
      })
      .join("");
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Jauni sludinājumi: "${escHtml(label)}" 🔔`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 8px;">Jauni sludinājumi tev!</h2>
          <p style="color: #4A3728; font-size: 15px; margin-bottom: 20px;">Meklēšana: <strong>${escHtml(label)}</strong></p>
          <ul style="padding-left: 20px; color: #1A1208; font-size: 15px; line-height: 1.8;">${rows}</ul>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">Pārvaldit saglabātās meklēšanas: <a href="https://jobsy.lv/settings" style="color:#E8512A;">jobsy.lv/settings</a><br/>© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendSearchAlert failed:", err);
  }
}

export async function sendBusinessWelcome(to: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Laipni lūdzam jobsy.lv Business! 🏢",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Business abonements aktivizēts 🎉</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Paldies, ka izvēlējies <strong>jobsy.lv Business</strong>! Tev tagad ir pieejams:
          </p>
          <ul style="color: #4A3728; font-size: 15px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>✅ Neierobežoti sludinājumi</li>
            <li>✅ 🏢 Business badge uz visiem sludinājumiem</li>
            <li>✅ Uzņēmuma profils (nosaukums, mājaslapa, apraksts)</li>
            <li>✅ 2 bezmaksas Featured boost katru mēnesi</li>
            <li>✅ Sludinājumu analītika</li>
          </ul>
          <a href="https://jobsy.lv/settings" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Pārvaldīt profilu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">Abonementa pārvaldīšana: <a href="https://jobsy.lv/settings" style="color:#E8512A;">jobsy.lv/settings</a><br/>© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendBusinessWelcome failed:", err);
  }
}

export async function sendPaymentFailed(to: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Jobsy.lv Business — maksājums neizdevās ⚠️",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Maksājums neizdevās</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
            Diemžēl mums neizdevās iekasēt maksājumu par tavu <strong>jobsy.lv Business</strong> abonementu.
          </p>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Tava Business abonements pagaidām ir aktīvs — Stripe mēģinās iekasēt maksājumu vēlreiz automātiski. Lūdzu, pārbaudi savu maksājuma metodi, lai abonements netiktu atcelts.
          </p>
          <a href="https://jobsy.lv/settings" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Pārvaldīt norēķinus →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendPaymentFailed failed:", err);
  }
}

export async function sendContactNotification(
  ownerEmail: string,
  postTitle: string,
  postId: number,
  contactorName: string
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    await resend.emails.send({
      from: FROM,
      to: ownerEmail,
      subject: `Kāds apskata tavu kontaktinformāciju — "${escHtml(postTitle)}"`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Jauns kontakts!</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${escHtml(contactorName)}</strong> apskata tavu kontaktinformāciju sludinājumā <strong>${escHtml(postTitle)}</strong>. Sagaidi zvanu vai e-pastu drīzumā!
          </p>
          <a href="${escHtml(postUrl)}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendContactNotification failed:", err);
  }
}

export async function sendPostExpired(
  to: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const safeTitle = escHtml(postTitle);
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tavs sludinājums ir beidzies — "${safeTitle}"`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Sludinājums ir beidzies</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Tavs sludinājums <strong>${safeTitle}</strong> ir beidzies un vairs nav redzams meklēšanas rezultātos. Ja palīgs vēl nav atrasts, vari publicēt jaunu sludinājumu — tas ir ātri un vienkārši!
          </p>
          <a href="https://jobsy.lv/create" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Publicēt jaunu sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendPostExpired failed:", err);
  }
}

export async function sendExpiryReminder(
  to: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    const safeTitle = escHtml(postTitle);
    const safeUrl = escHtml(postUrl);
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tavs sludinājums beidzas pēc 3 dienām ⏰",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Sludinājums beidzas drīz</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Tavs sludinājums <strong>${safeTitle}</strong> beidzas pēc 3 dienām. Ja palīgs vēl nav atrasts, apsver publicēt jaunu sludinājumu.
          </p>
          <a href="${safeUrl}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendExpiryReminder failed:", err);
  }
}
