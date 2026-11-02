import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lpdfsopxczgppcqmzqrf.supabase.co';
const supabaseKey = 'sb_publishable_nDle-xm2fvlzPAPtdfSi-g_Pe9RSmNw'; 

export const supabase = createClient(supabaseUrl, supabaseKey);