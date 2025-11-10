import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get auth header to verify admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    // Verify user is admin using regular client
    const regularClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await regularClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is admin
    const { data: roles } = await regularClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      throw new Error('Admin access required')
    }

    const { centerId } = await req.json()

    console.log(`Admin ${user.id} hard deleting test center: ${centerId}`)

    // Delete in correct order (respecting foreign keys)
    
    // 1. Delete messages in conversations
    const { data: conversationIds } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('repair_center_id', centerId)
    
    if (conversationIds && conversationIds.length > 0) {
      for (const conv of conversationIds) {
        await supabaseClient
          .from('messages')
          .delete()
          .eq('conversation_id', conv.id)
      }
    }

    // 2. Delete conversations
    await supabaseClient
      .from('conversations')
      .delete()
      .eq('repair_center_id', centerId)

    // 3. Delete repair jobs
    await supabaseClient
      .from('repair_jobs')
      .delete()
      .eq('repair_center_id', centerId)

    // 4. Delete payouts
    await supabaseClient
      .from('repair_center_payouts')
      .delete()
      .eq('repair_center_id', centerId)

    // 5. Delete reviews
    await supabaseClient
      .from('repair_center_reviews')
      .delete()
      .eq('repair_center_id', centerId)

    // 6. Delete settings
    await supabaseClient
      .from('repair_center_settings')
      .delete()
      .eq('repair_center_id', centerId)

    // 7. Delete bank accounts
    await supabaseClient
      .from('repair_center_bank_accounts')
      .delete()
      .eq('repair_center_id', centerId)

    // 8. Delete staff
    await supabaseClient
      .from('repair_center_staff')
      .delete()
      .eq('repair_center_id', centerId)

    // 9. Finally delete the center
    const { error: centerError } = await supabaseClient
      .from('Repair Center')
      .delete()
      .eq('id', centerId)

    if (centerError) {
      throw centerError
    }

    console.log(`Successfully deleted center ${centerId} and all associated data`)

    return new Response(
      JSON.stringify({ success: true, message: 'Test center deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting test center:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
