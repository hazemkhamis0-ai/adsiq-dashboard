export default async function handler(req, res) {
  const { token, action, accountId, since, until } = req.query
  if (!token) return res.status(401).json({ error: 'No token' })

  const dateFrom = since || getDateDaysAgo(7)
  const dateTo = until || getToday()

  try {
    if (action === 'me') {
      const r = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture.type(large)&access_token=${token}`)
      return res.json(await r.json())
    }

    if (action === 'accounts') {
      const r = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,currency,account_status,business&limit=50&access_token=${token}`)
      return res.json(await r.json())
    }

    if (action === 'campaigns' && accountId) {
      const r = await fetch(`https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=100&access_token=${token}`)
      return res.json(await r.json())
    }

    if (action === 'insights' && accountId) {
      const fields = [
        'spend','impressions','clicks','ctr','cpm','cpp','reach','frequency',
        'actions','action_values','cost_per_action_type','purchase_roas',
        'campaign_name','campaign_id','date_start','date_stop'
      ].join(',')
      const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
      const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&level=campaign&limit=100&access_token=${token}`
      const r = await fetch(url)
      const d = await r.json()
      return res.json(d)
    }

    if (action === 'account_insights' && accountId) {
      const fields = 'spend,impressions,clicks,ctr,cpm,reach,frequency,actions,action_values,purchase_roas'
      const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
      const r = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&access_token=${token}`)
      return res.json(await r.json())
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function getToday() { return new Date().toISOString().split('T')[0] }
function getDateDaysAgo(days) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]
}
