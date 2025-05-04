import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. Make sure you have created a .env file in the root directory with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY'
  )
  // You might want to throw an error or handle this case more gracefully
  // depending on your application's needs.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 