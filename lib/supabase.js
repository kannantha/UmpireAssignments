import { createClient } from '@supabase/supabase-js';

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // During build without env vars — return a no-op stub so the build succeeds.
    // At runtime the real env vars must be set.
    if (typeof window === 'undefined') {
      return /** @type {any} */ ({
        from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null } }),
          signInWithPassword: () => Promise.resolve({ error: null }),
          signOut: () => Promise.resolve({}),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
      });
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  }
  _client = createClient(url, key);
  return _client;
}

// Proxy so callers can do `supabase.from(...)` etc. without calling getClient() themselves.
export const supabase = new Proxy(/** @type {any} */ ({}), {
  get(_target, prop) {
    return getClient()[prop];
  },
});
