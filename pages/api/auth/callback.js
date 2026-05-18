export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.redirect('/?error=access_denied')
  }

  if (!code) {
    return res.redirect('/?error=no_code')
  }

  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Token error:', tokenData.error)
      return res.redirect('/?error=token_failed')
    }

    const accessToken = tokenData.access_token

    // Get long-lived token
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
    const longRes = await fetch(longLivedUrl)
    const longData = await longRes.json()
    const finalToken = longData.access_token || accessToken

    // Redirect to dashboard with token
    res.redirect(`/dashboard?token=${finalToken}`)
  } catch (err) {
    console.error('Auth error:', err)
    res.redirect('/?error=server_error')
  }
}
