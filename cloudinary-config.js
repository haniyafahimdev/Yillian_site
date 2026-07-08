// ============================================================
// CLOUDINARY CONFIG — replace the two values below with yours.
//
// Cloud Name: Cloudinary Dashboard home page, top left, under your account
// name (e.g. "dabc123xy").
//
// Upload Preset: Dashboard → gear icon (Settings) → Upload tab → scroll to
// "Upload presets" → Add upload preset → set "Signing Mode" to UNSIGNED →
// Save. Copy the preset name it gives you (or set your own).
//
// Both values are safe to be public in this file — they are not secret keys.
// The actual API Key/Secret are only ever used server-side, in the
// /api/delete-image.js function, as Vercel environment variables — never in
// this file or anywhere else in client-side code.
// ============================================================

export const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
export const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
