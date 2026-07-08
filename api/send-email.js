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

  const { type, date, time, service, name, contact, notes, images } = req.body || {};

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const YILIAN_EMAIL = process.env.YILIAN_EMAIL || 'haniyafahim.dev@gmail.com';
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set — skipping email send.');
    return res.status(200).json({ skipped: true, reason: 'Email not configured yet' });
  }

  const prettyDate = date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : date;
  const prettyTime = formatTime(time);

  let to, subject, html;

  if (type === 'new') {
    to = YILIAN_EMAIL;
    subject = `New booking request — ${name || 'someone'}, ${prettyDate}`;
    html = `
      <div style="font-family:sans-serif; color:#6b4650;">
        <h2 style="color:#b4707d;">New booking request 🌸</h2>
        <p><strong>${escapeHtml(service)}</strong> on <strong>${prettyDate}</strong> at <strong>${prettyTime}</strong></p>
        <p>From: ${escapeHtml(name)} (${escapeHtml(contact)})</p>
        ${notes ? `<p>Notes: <em>${escapeHtml(notes)}</em></p>` : ''}
        ${images && images.length ? `<p>Inspo photos: ${images.map((url, i) => `<a href="${url}">Photo ${i + 1}</a>`).join(' &middot; ')}</p>` : ''}
        <p style="margin-top:20px;">Confirm or decline it from your admin dashboard.</p>
      </div>
    `;
  } else if (type === 'confirmed') {
    to = contact && contact.includes('@') ? contact : YILIAN_EMAIL;
    subject = `You're booked! ${prettyDate} at ${prettyTime}`;
    html = `
      <div style="font-family:sans-serif; color:#6b4650;">
        <h2 style="color:#b4707d;">Your appointment is confirmed 🌸</h2>
        <p><strong>${escapeHtml(service)}</strong></p>
        <p>${prettyDate} at ${prettyTime}</p>
        <p style="margin-top:20px;">See you then! Reply to this email or DM @nailsby_yilian if anything changes.</p>
      </div>
    `;
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
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
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
