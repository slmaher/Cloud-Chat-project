import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CookieStoreOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: true | false | 'lax' | 'strict' | 'none';
  secure?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type CookieStoreOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  priority?: 'low' | 'medium' | 'high';
};

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieStoreOptions = {}) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieStoreOptions = {}) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
} 