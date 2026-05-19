export default async function handler(req, res) {
  const { uid } = req.query
  if (!uid) return res.status(400).json({ error: 'No uid' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/users?facebook_id=eq.${uid}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    const data = await r.json()
    if (data?.length > 0) {
      return res.json({ token: data[0].meta_token, name: data[0].name, tiktok_token: data[0].tiktok_token, tiktok_advertiser_id: data[0].tiktok_advertiser_id })
    }
    res.status(404).json({ error: 'User not found' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
