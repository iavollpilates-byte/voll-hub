import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bofbhfsvxfqolpvdtvfz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZmJoZnN2eGZxb2xwdmR0dmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDE3NTcsImV4cCI6MjA4NzA3Nzc1N30.SoeAEIhIy7PF_0wqyU5qM_pF3H9TtddiSaZcvdccD24'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
