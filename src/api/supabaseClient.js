import { createClient } from '@supabase/supabase-js';
import { appParams } from '@/lib/app-params';

const supabaseUrl = appParams.supabaseUrl;
const supabaseAnonKey = appParams.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'la-paleta-admin-app',
    },
  },
});
