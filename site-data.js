// ============================================================
// Shared read-only data helpers for the public site.
// index.html, services.html, and book.html all import from here
// so that everything Yilian edits in admin.html (services, gallery,
// business hours, blocked days, contact info) shows up everywhere
// automatically — no code edits needed for everyday changes.
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, query, orderBy, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Active services only, in display order. Used by services.html, book.html,
// and the "Popular Services" preview on index.html.
export async function getActiveServices(){
  try{
    // Note: sorting by 'order' but filtering 'active' client-side (rather than
    // a Firestore where+orderBy on two different fields) deliberately avoids
    // needing a composite index set up in the Firebase console.
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.active);
  }catch(err){
    console.error('Could not load services:', err);
    return [];
  }
}

// All gallery photos, in display order.
export async function getGalleryImages(){
  try{
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }catch(err){
    console.error('Could not load gallery:', err);
    return [];
  }
}

// Business settings doc (hours, slot length, blocked dates, contact info).
// Returns null if it hasn't been created yet (Yilian hasn't opened Settings
// and saved once) — callers should fall back to DEFAULT_BUSINESS_HOURS etc.
// from firebase-config.js in that case.
export async function getBusinessSettings(){
  try{
    const snap = await getDoc(doc(db, 'settings', 'business'));
    if(snap.exists()) return snap.data();
  }catch(err){
    console.error('Could not load business settings:', err);
  }
  return null;
}

// Formats a service's price for display.
// priceType: 'starting' -> "$30 · Starting at", 'fixed' -> "$30", 'ask' -> "Ask for pricing"
export function formatServicePrice(service){
  if(service.priceType === 'ask' || service.price == null){
    return { label: 'Ask for pricing', isAsk: true };
  }
  const amount = `$${service.price}`;
  return { label: amount, sub: service.priceType === 'fixed' ? '' : 'Starting at', isAsk: false };
}
