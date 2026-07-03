import { createClient } from '@supabase/supabase-js'
// Initie la connexion a Supabase

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLIC_KEY)
