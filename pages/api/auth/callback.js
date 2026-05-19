export default async function handler(req, res) {
  const { code, error } = req.query
  if (error) return res.redirect('/?error=access_denied')
  if (!code) return res.redirect('/?error=no_code')

  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

    // Exchange code for token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()
    if (tokenData.error) return res.redirect('/?error=token_failed')

    // Get long-lived token
    const longUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    const longRes = await fetch(longUrl)
    const longData = await longRes.json()
    const finalToken = longData.access_token || tokenData.access_token

    // Get user info
    const userRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${finalToken}`)
    const userData = await userRes.json()

    // Save to Supabase
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    if (supabaseUrl && supabaseKey && userData.id) {
      await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          facebook_id: userData.id,
          name: userData.name,
          meta_token: finalToken,
          updated_at: new Date().toISOString()
        })
      })
    }

    res.redirect(`/dashboard?token=${finalToken}&uid=${userData.id}`)
  } catch (err) {
    res.redirect('/?error=server_error')
  }
}
