import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qtjvyljojwvabdjapwfx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0anZ5bGpvand2YWJkamFwd2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTU2NDYsImV4cCI6MjA5MTEzMTY0Nn0.PhAufdehqI8hSd8Q2XvdKq_kYS7gOsz7wuERmJ9vZvA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
