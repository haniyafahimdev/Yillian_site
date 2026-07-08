// api/delete-image.js
// Vercel serverless function. Deleting a Cloudinary image requires a signed
// request (a SHA-1 signature made with your API Secret), which must never
// run in the browser — this is the only place that signature is generated.
//
// Setup on Vercel (values from Cloudinary Dashboard → gear icon → API Keys):
//   vercel env add CLOUDINARY_CLOUD_NAME
//   vercel env add CLOUDINARY_API_KEY
//   vercel env add CLOUDINARY_API_SECRET

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { publicId } = req.body || {};
  if (!publicId) {
    return res.status(400).json({ error: 'Missing publicId' });
  }

  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn('Cloudinary env vars are not set — cannot delete image.');
    return res.status(500).json({ error: 'Image deletion is not configured yet' });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary signature: SHA-1 of the sorted params + API secret, per
    // https://cloudinary.com/documentation/authentication_signatures
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const form = new URLSearchParams();
    form.append('public_id', publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', API_KEY);
    form.append('signature', signature);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const data = await cloudRes.json();
    if (data.result !== 'ok' && data.result !== 'not found') {
      console.error('Cloudinary delete error:', data);
      return res.status(502).json({ error: 'Cloudinary delete failed', detail: data });
    }

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Delete image failed:', err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
}
