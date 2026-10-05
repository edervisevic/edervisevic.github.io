import { withSupabase } from 'npm:@supabase/server@1.9.0';

const handler = withSupabase({ auth: 'user' }, async (request, context) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const userId = context.userClaims?.id;
  if (!userId) {
    return Response.json({ error: 'Sign in again before deleting your account.' }, { status: 401 });
  }

  // `supabaseAdmin` stays on the server. Hard deletion cascades through profiles
  // and lesson_progress via their auth.users foreign keys.
  const { error } = await context.supabaseAdmin.auth.admin.deleteUser(userId, false);
  if (error) {
    console.error('Account deletion failed:', error.message);
    return Response.json({ error: 'The account could not be deleted.' }, { status: 500 });
  }

  return Response.json({ deleted: true });
});

Deno.serve(handler);
