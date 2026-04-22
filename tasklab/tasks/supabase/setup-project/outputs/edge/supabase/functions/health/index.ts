import { corsHeaders } from '../_shared/cors.ts';
import { supabase } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Minimal smoke response: validates the function runs and the Supabase client initializes.
  // (DB connectivity depends on schema/RLS and is best tested per-project.)
  return new Response(JSON.stringify({ ok: true, client: !!supabase }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
