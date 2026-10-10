// Where the page's data comes from.
//
// Supabase is asked first when it is configured (config.js). Firestore answers when Supabase
// is not configured, has no such card or logo, or cannot be reached within a few seconds, so
// a card that only exists in the old store still shows up during the transition.

import { supabaseConfig } from './config.js';
import { db, doc, getDoc } from './firebase.js';

// Firestore collection that holds this shop's cards and its "headerimage" document.
const accCode = "08ubKtZF150O6Q99kCT1nPUgx8t2tVNjWsJibPEaSRX0KqURd96ICmc4y5sJzJIKtwT0LJQvojdfCnIif0LSxfFufFlZXtxLz5y9jdBWaH90B25F0TNYOw1Wz01it1MA"

const SUPABASE_TIMEOUT_MS = 4000;

const supabaseUrl = String(supabaseConfig.url || '').trim().replace(/\/+$/, '');
const supabaseKey = String(supabaseConfig.publishableKey || '').trim();
const shopCode = String(supabaseConfig.shopCode || '').trim();
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey && shopCode);

// Set after the first failed or timed-out request, so one page view waits for an
// unreachable Supabase only once and not again for every further request.
let supabaseUnreachable = false;

// POST <project-url>/rest/v1/rpc/<name> with the publishable key in the "apikey" header.
async function callSupabase(name, args) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(args),
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

// The function's result (null when there is no such row), or undefined when Supabase
// is not configured or did not answer. undefined and null both mean: ask Firestore.
async function askSupabase(name, args) {
    if (!supabaseConfigured || supabaseUnreachable) {
        return undefined;
    }
    try {
        return await callSupabase(name, args);
    } catch (e) {
        supabaseUnreachable = true;
        console.warn(`Supabase ${name} failed, using Firestore`, e);
        return undefined;
    }
}

// { current, total, source } for a card number, or null if no store knows the card.
export async function loadCard(number) {
    if (!number) {
        return null;
    }

    const card = await askSupabase('get_card', { shop: shopCode, card: number });
    if (card && Number.isFinite(card.current) && Number.isFinite(card.total)) {
        return { current: card.current, total: card.total, source: 'supabase' };
    }

    const snap = await getDoc(doc(db, accCode, number));
    if (snap.exists()) {
        const data = snap.data();
        return { current: data.current, total: data.total, source: 'firestore' };
    }
    return null;
}

// { url, urlDark, name, source } for the header logo. source is null when no store has a
// logo. name is the shop's name from Supabase, or '' when there is none.
export async function loadShopLogo() {
    const shop = await askSupabase('get_shop', { shop: shopCode });
    const name = shop && typeof shop.name === 'string' ? shop.name.trim() : '';
    if (shop && shop.logo_url) {
        return { url: shop.logo_url, urlDark: shop.logo_url_dark || '', name, source: 'supabase' };
    }

    const snap = await getDoc(doc(db, accCode, 'headerimage'));
    if (snap.exists()) {
        const data = snap.data();
        return { url: data.url, urlDark: data.url_dark, name, source: 'firestore' };
    }
    return { url: '', urlDark: '', name, source: null };
}
