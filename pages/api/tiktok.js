export default async function handler(req, res) {
  const { token, advertiserId, since, until, action } = req.query
  if (!token || !advertiserId) return res.status(401).json({ error: 'No token' })

  const dateFrom = since || getDaysAgo(7)
  const dateTo = until || getToday()

  try {
    if (action === 'campaigns') {
      const r = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&page_size=100`, {
        headers: { 'Access-Token': token }
      })
      return res.json(await r.json())
    }

    if (action === 'insights') {
      const body = {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        dimensions: ['campaign_id'],
        metrics: ['spend','impressions','clicks','ctr','cpm','reach','frequency','purchase','purchase_value','roas','cost_per_purchase'],
        data_level: 'AUCTION_CAMPAIGN',
        start_date: dateFrom,
        end_date: dateTo,
        page_size: 100
      }
      const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', {
        method: 'POST',
        headers: { 'Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      return res.json(await r.json())
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

function getToday() { return new Date().toISOString().split('T')[0] }
function getDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
