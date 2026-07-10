// api/send-email.js
// Vercel serverless function. Runs on the server, so this is the only
// place the Resend API key ever touches — it's read from an environment
// variable and never sent to the browser.
//
// Setup on Vercel:
//   vercel env add RESEND_API_KEY
//   vercel env add YILIAN_EMAIL      (where booking notifications go)
//   vercel env add FROM_EMAIL        (e.g. bookings@yourdomain.com, once verified in Resend)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, date, time, service, name, contact, instagram, notes, images } = req.body || {};

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const YILIAN_EMAIL = process.env.YILIAN_EMAIL || 'haniyafahim.dev@gmail.com';
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set — skipping email send.');
    return res.status(200).json({ skipped: true, reason: 'Email not configured yet' });
  }

  const prettyDate = date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : date;
  const prettyTime = formatTime(time);

  let to, subject, html, replyTo;

  if (type === 'new') {
    to = YILIAN_EMAIL;
    subject = `New booking request — ${name || 'someone'}, ${prettyDate}`;
    html = emailTemplate({
      heading: 'New Booking Request',
      intro: `${escapeHtml(name || 'Someone')} would like to book an appointment.`,
      rows: [
        ['Service', escapeHtml(service)],
        ['Date', prettyDate],
        ['Time', prettyTime],
        ['Contact', escapeHtml(contact)],
        ...(instagram ? [['Instagram', escapeHtml(instagram)]] : []),
        ...(notes ? [['Notes', escapeHtml(notes)]] : [])
      ],
      imagesHtml: (images && images.length)
        ? `<tr><td style="padding:6px 0;">
             <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:13px; color:#a9838a; text-transform:uppercase; letter-spacing:1px;">Inspo Photos</p>
             ${images.map(url => `<a href="${url}" style="display:inline-block; margin:0 8px 8px 0;"><img src="${url}" width="72" height="72" style="border-radius:10px; object-fit:cover; display:block;"></a>`).join('')}
           </td></tr>`
        : '',
      ctaLabel: 'Review in Dashboard',
      ctaUrl: 'https://yillian-site.vercel.app/admin.html',
      footerNote: 'Confirm or decline this request from your admin dashboard.'
    });
  } else if (type === 'confirmed') {
    const hasEmail = contact && contact.includes('@');

    if (hasEmail) {
      to = contact;
      replyTo = YILIAN_EMAIL;
      subject = `You're booked! ${prettyDate} at ${prettyTime}`;
      html = emailTemplate({
        heading: 'You\'re All Set 🌸',
        intro: `Hi ${escapeHtml(name || 'there')}, your appointment is confirmed!`,
        rows: [
          ['Service', escapeHtml(service)],
          ['Date', prettyDate],
          ['Time', prettyTime]
        ],
        ctaLabel: 'Message on Instagram',
        ctaUrl: 'https://instagram.com/nailsby_yilian',
        footerNote: 'See you then! Reply to this email or reach out on Instagram @nailsby_yilian if anything changes.'
      });
    } else {
      // No email on file — this person only gave a phone number, so there's
      // nowhere to send *them* a confirmation email. Instead, remind Yilian
      // to confirm with them directly, with a WhatsApp link pre-filled with
      // a ready-to-send message so it's a single tap, not retyping everything.
      to = YILIAN_EMAIL;
      subject = `Reminder: confirm with ${name || 'client'} via WhatsApp`;
      const waDigits = (contact || '').replace(/\D/g, '');
      const waMessage = encodeURIComponent(`Hi ${name || ''}! Your ${service || 'appointment'} is confirmed for ${prettyDate} at ${prettyTime}. See you then! 🌸`);
      const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${waMessage}` : 'https://web.whatsapp.com';
      html = emailTemplate({
        heading: 'Confirm With Your Client',
        intro: `${escapeHtml(name || 'This client')} only left a phone number, so they can't get an email confirmation — send them one on WhatsApp instead.`,
        rows: [
          ['Service', escapeHtml(service)],
          ['Date', prettyDate],
          ['Time', prettyTime],
          ['Phone', escapeHtml(contact)],
          ...(instagram ? [['Instagram', escapeHtml(instagram)]] : [])
        ],
        ctaLabel: 'Confirm on WhatsApp',
        ctaUrl: waUrl,
        footerNote: 'The button above opens a WhatsApp chat with a confirmation message already written — just hit send.'
      });
    }
  } else {
    return res.status(400).json({ error: 'Unknown email type' });
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return res.status(502).json({ error: 'Email provider error', detail: errText });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Send email failed:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

function emailTemplate({ heading, intro, rows, imagesHtml = '', ctaLabel, ctaUrl, footerNote }) {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #f0dde1; font-family:Helvetica,Arial,sans-serif; font-size:12px; letter-spacing:0.5px; text-transform:uppercase; color:#a9838a; width:110px; vertical-align:top;">${label}</td>
      <td style="padding:10px 0; border-bottom:1px solid #f0dde1; font-family:Helvetica,Arial,sans-serif; font-size:15px; color:#6b4650;">${value}</td>
    </tr>
  `).join('');

  return `
  <div style="background-color:#fdfaf7; padding:32px 16px; font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
      <tr>
        <td style="background:linear-gradient(135deg,#b4707d,#d4af7a); background-color:#c9968a; border-radius:20px 20px 0 0; padding:28px 32px; text-align:center;">
          <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:26px; color:#ffffff; letter-spacing:0.5px;">Yilian</p>
          <p style="margin:4px 0 0; font-family:Helvetica,Arial,sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.85);">Nail Tech in Houston</p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#ffffff; padding:32px; border-left:1px solid #f0dde1; border-right:1px solid #f0dde1;">
          <h1 style="margin:0 0 10px; font-family:Georgia,'Times New Roman',serif; font-size:22px; color:#b4707d; font-weight:normal;">${heading}</h1>
          <p style="margin:0 0 22px; font-family:Helvetica,Arial,sans-serif; font-size:15px; color:#6b4650; line-height:1.6;">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rowsHtml}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${imagesHtml}
          </table>
          ${ctaLabel ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
            <tr>
              <td style="border-radius:999px; background-color:#b4707d;">
                <a href="${ctaUrl}" style="display:inline-block; padding:13px 28px; font-family:Helvetica,Arial,sans-serif; font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#ffffff; text-decoration:none; border-radius:999px;">${ctaLabel}</a>
              </td>
            </tr>
          </table>` : ''}
          <p style="margin:22px 0 0; font-family:Helvetica,Arial,sans-serif; font-size:13px; color:#a9838a; line-height:1.6;">${footerNote}</p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#fdfaf7; border-radius:0 0 20px 20px; padding:20px 32px; text-align:center; border:1px solid #f0dde1; border-top:none;">
          <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:13px; color:#c9968a;">with love, always 🤍</p>
        </td>
      </tr>
    </table>
  </div>`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
