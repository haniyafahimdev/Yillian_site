// ============================================================
// Shared Cloudinary upload helper.
// Used by admin.html (Gallery tab) and book.html (inspo photo upload).
// Deleting an image is handled separately by /api/delete-image.js, since
// deletion requires a signed request (API key/secret) that must never run
// in the browser.
// ============================================================

import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from './cloudinary-config.js';

// Uploads a single File/Blob to Cloudinary and returns { url, publicId }.
// `folder` groups images in the Cloudinary Media Library (e.g. 'gallery' vs 'bookings').
export async function uploadToCloudinary(file, folder = 'uploads'){
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
  if(!res.ok){
    const errText = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
