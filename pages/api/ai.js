export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, context, history } = req.body
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ reply: 'مفتاح الذكاء الاصطناعي غير موجود. روح Vercel → Settings → Environment Variables وأضف GEMINI_API_KEY' })

  const systemPrompt = `أنت محلل إعلانات رقمي خبير ومستشار بيزنس متخصص في السوق العربي. أجب دائماً بالعربية بشكل عملي ومفيد. ${context ? 'بيانات الحملات: ' + context : ''}`

  const contents = [
    ...(history || []).slice(-6).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: systemPrompt + '\n\n' + message }] }
  ]

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } })
    })
    const d = await r.json()
    if (d.error) return res.status(200).json({ reply: 'خطأ Gemini: ' + d.error.message })
    const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يأتِ رد.'
    res.status(200).json({ reply })
  } catch (e) {
    res.status(200).json({ reply: 'خطأ في الاتصال: ' + e.message })
  }
}
