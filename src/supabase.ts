import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibzrjiblcsigonidmfqp.supabase.co';
const supabaseAnonKey = 'sb_publishable_B2OO_p8JLWUJN0iG-MOHyA_gVzbCBN4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
