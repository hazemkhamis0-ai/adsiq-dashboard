export default async function handler(req, res) {
  const { code, error } = req.query
  if (error) return res.redirect('/dashboard?tiktok_error=access_denied')
  if (!code) return res.redirect('/dashboard?tiktok_error=no_code')

  try {
    const appId = process.env.TIKTOK_APP_ID
    const appSecret = process.env.TIKTOK_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok-callback`

    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, secret: appSecret, auth_code: code, grant_type: 'authorization_code', redirect_uri: redirectUri })
    })
    const d = await r.json()
    if (d.code !== 0) return res.redirect(`/dashboard?tiktok_error=${d.message}`)
    const token = d.data?.access_token
    const advertiserId = d.data?.advertiser_ids?.[0]
    res.redirect(`/dashboard?tiktok_token=${token}&tiktok_advertiser=${advertiserId}`)
  } catch (e) {
    res.redirect(`/dashboard?tiktok_error=${e.message}`)
  }
}
