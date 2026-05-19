export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { uid, tiktok_token, tiktok_advertiser_id } = req.body
  if (!uid) return res.status(400).json({ error: 'No uid' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  try {
    await fetch(`${supabaseUrl}/rest/v1/users?facebook_id=eq.${uid}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ tiktok_token, tiktok_advertiser_id, updated_at: new Date().toISOString() })
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
