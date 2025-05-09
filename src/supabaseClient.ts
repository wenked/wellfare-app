// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Read values from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Supabase URL (VITE_SUPABASE_URL) and anon key (VITE_SUPABASE_ANON_KEY) are required. Please check your .env file.'
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
