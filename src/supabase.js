import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iaavqhtlrpsksrkieuph.supabase.co'
const supabaseKey = 'sb_publishable_Cqgnwzkbpng4sLLGXK3tAQ_Rcr-n6Vj'

export const supabase = createClient(supabaseUrl, supabaseKey)