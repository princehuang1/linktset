import { createClient } from '@supabase/supabase-js'

// .env.local的金鑰
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 建立並匯出 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseKey)