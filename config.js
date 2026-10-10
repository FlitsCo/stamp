// Supabase backend for the stamp page. Firestore (firebase.js) stays as the fallback.
//
// Fill in all three values at cutover. While any of them is empty, the page reads
// from Firestore only, exactly as it did before Supabase was added.
//
//   url             Project URL, e.g. 'https://abcdefghijklmnopqrst.supabase.co'
//   publishableKey  The project's publishable key ('sb_publishable_...'). It is meant to be
//                   public. Never put a secret key ('sb_secret_...') or a shop's write key here.
//   shopCode        This shop's code in the "shops" table, e.g. 'kinderyoga-sabine'
export const supabaseConfig = {
    url: '',
    publishableKey: '',
    shopCode: ''
};
