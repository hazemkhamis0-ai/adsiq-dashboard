import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const ALL_METRICS = [
  { key: 'spend', label: 'الصرف', icon: '💰' },
  { key: 'revenue', label: 'الإيرادات', icon: '💵' },
  { key: 'roas', label: 'ROAS', icon: '📈' },
  { key: 'cpa', label: 'CPA', icon: '🎯' },
  { key: 'impressions', label: 'Impressions', icon: '👁️' },
  { key: 'clicks', label: 'Clicks', icon: '🖱️' },
  { key: 'ctr', label: 'CTR', icon: '📊' },
  { key: 'cpm', label: 'CPM', icon: '📉' },
  { key: 'reach', label: 'Reach', icon: '🌍' },
  { key: 'frequency', label: 'Frequency', icon: '🔄' },
  { key: 'purchases', label: 'Purchases', icon: '🛒' },
]
const DEFAULT_METRICS = ['spend','revenue','roas','cpa','ctr','frequency']

function getDaysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
function getToday() { return new Date().toISOString().split('T')[0] }

export default function Dashboard() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [tiktokToken, setTiktokToken] = useState(null)
  const [tiktokAdvertiserId, setTiktokAdvertiserId] = useState(null)
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [insights, setInsights] = useState([])
  const [tiktokInsights, setTiktokInsights] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [activePlatform, setActivePlatform] = useState('meta')
  const [since, setSince] = useState(getDaysAgo(7))
  const [until, setUntil] = useState(getToday())
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_METRICS)
  const [showMetricsPicker, setShowMetricsPicker] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'أهلاً! أنا مساعدك الذكي 🤖\n\nبياناتك محملة — اسألني عن:\n• تحليل أداء حملاتك\n• اكتشاف المشاكل والحلول\n• توصيات الميزانية\n• أي سؤال بيزنس' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [issues, setIssues] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    const urlToken = router.query.token
    const urlTiktokToken = router.query.tiktok_token
    const urlTiktokAdv = router.query.tiktok_advertiser
    const savedToken = localStorage.getItem('meta_access_token')
    const savedTiktok = localStorage.getItem('tiktok_access_token')
    const savedTiktokAdv = localStorage.getItem('tiktok_advertiser_id')

    const t = urlToken || savedToken
    if (!t) { router.push('/'); return }
    if (urlToken) { localStorage.setItem('meta_access_token', urlToken) }
    if (urlTiktokToken) { localStorage.setItem('tiktok_access_token', urlTiktokToken); setTiktokToken(urlTiktokToken) }
    if (urlTiktokAdv) { localStorage.setItem('tiktok_advertiser_id', urlTiktokAdv); setTiktokAdvertiserId(urlTiktokAdv) }
    if (savedTiktok) setTiktokToken(savedTiktok)
    if (savedTiktokAdv) setTiktokAdvertiserId(savedTiktokAdv)
    if (urlToken || urlTiktokToken) router.replace('/dashboard')
    setToken(t)

    const saved = localStorage.getItem('selected_metrics')
    if (saved) try { setSelectedMetrics(JSON.parse(saved)) } catch {}
  }, [router.query])

  useEffect(() => { if (!token) return; fetchUser(); fetchAccounts() }, [token])
  useEffect(() => { if (selectedAccount) { fetchInsights(); fetchCampaigns() } }, [selectedAccount, since, until])
  useEffect(() => { if (tiktokToken && tiktokAdvertiserId && activePlatform === 'tiktok') fetchTiktokInsights() }, [tiktokToken, tiktokAdvertiserId, since, until, activePlatform])
  useEffect(() => { detectIssues() }, [insights, tiktokInsights])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  async function fetchUser() {
    const r = await fetch(`/api/meta?token=${token}&action=me`)
    const d = await r.json()
    if (d.name) setUser(d)
  }

  async function fetchAccounts() {
    setLoading(true)
    const r = await fetch(`/api/meta?token=${token}&action=accounts`)
    const d = await r.json()
    if (d.data?.length > 0) { setAccounts(d.data); setSelectedAccount(d.data[0].id) }
    else setLoading(false)
  }

  async function fetchInsights() {
    setLoading(true)
    const r = await fetch(`/api/meta?token=${token}&action=insights&accountId=${selectedAccount}&since=${since}&until=${until}`)
    const d = await r.json()
    setInsights(d.data || [])
    setLoading(false)
  }

  async function fetchCampaigns() {
    const r = await fetch(`/api/meta?token=${token}&action=campaigns&accountId=${selectedAccount}`)
    const d = await r.json()
    if (d.data) setCampaigns(d.data)
  }

  async function fetchTiktokInsights() {
    setLoading(true)
    const r = await fetch(`/api/tiktok?token=${tiktokToken}&advertiserId=${tiktokAdvertiserId}&action=insights&since=${since}&until=${until}`)
    const d = await r.json()
    setTiktokInsights(d.data?.list || [])
    setLoading(false)
  }

  function connectTiktok() {
    const appId = process.env.NEXT_PUBLIC_TIKTOK_APP_ID
    if (!appId) { alert('محتاج تضيف NEXT_PUBLIC_TIKTOK_APP_ID في Vercel — هنعمله بعدين'); return }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/tiktok-callback`)
    window.location.href = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${redirectUri}&state=tiktok_auth`
  }

  function detectIssues() {
    const found = []
    const allInsights = activePlatform === 'tiktok' ? tiktokInsights : insights
    allInsights.forEach(c => {
      const name = c.campaign_name || c.dimensions?.campaign_id || 'حملة'
      const spend = parseFloat(c.spend || c.metrics?.spend || 0)
      const roas = parseFloat(c.purchase_roas?.[0]?.value || c.metrics?.roas || 0)
      const freq = parseFloat(c.frequency || c.metrics?.frequency || 0)
      const ctr = parseFloat(c.ctr || c.metrics?.ctr || 0)
      const purchases = parseInt(c.actions?.find(a=>a.action_type==='purchase')?.value || c.metrics?.purchase || 0)
      if (roas > 0 && roas < 2) found.push({ level: 'danger', campaign: name, msg: `ROAS منخفض (${roas.toFixed(1)}x)`, detail: 'راجع الجمهور أو صفحة الهبوط' })
      if (freq > 4) found.push({ level: 'warn', campaign: name, msg: `Audience Fatigue — Frequency ${freq.toFixed(1)}`, detail: 'غير الـ Creative أو وسّع الجمهور' })
      if (ctr > 0 && ctr < 0.5) found.push({ level: 'warn', campaign: name, msg: `CTR ضعيف (${ctr.toFixed(2)}%)`, detail: 'غير الصورة أو الـ Headline' })
      if (spend > 0 && purchases === 0 && roas === 0) found.push({ level: 'danger', campaign: name, msg: `صرف بدون تحويلات`, detail: 'تأكد من إعداد الـ Pixel' })
    })
    setIssues(found)
  }

  function getMetaTotals() {
    return insights.reduce((acc, c) => {
      acc.spend += parseFloat(c.spend || 0)
      acc.impressions += parseInt(c.impressions || 0)
      acc.clicks += parseInt(c.clicks || 0)
      acc.purchases += parseInt(c.actions?.find(a=>a.action_type==='purchase')?.value || 0)
      acc.revenue += parseFloat(c.action_values?.find(a=>a.action_type==='purchase')?.value || 0)
      acc.reach += parseInt(c.reach || 0)
      return acc
    }, { spend:0, impressions:0, clicks:0, purchases:0, revenue:0, reach:0 })
  }

  function getTiktokTotals() {
    return tiktokInsights.reduce((acc, c) => {
      const m = c.metrics || {}
      acc.spend += parseFloat(m.spend || 0)
      acc.impressions += parseInt(m.impressions || 0)
      acc.clicks += parseInt(m.clicks || 0)
      acc.purchases += parseInt(m.purchase || 0)
      acc.revenue += parseFloat(m.purchase_value || 0)
      acc.reach += parseInt(m.reach || 0)
      return acc
    }, { spend:0, impressions:0, clicks:0, purchases:0, revenue:0, reach:0 })
  }

  function getStatValue(key, totals) {
    const t = totals
    const roas = t.spend > 0 ? t.revenue / t.spend : 0
    const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0
    const avgFreq = insights.length > 0 ? insights.reduce((s,c)=>s+parseFloat(c.frequency||0),0)/insights.length : 0
    switch(key) {
      case 'spend': return { val: t.spend > 0 ? t.spend.toFixed(0) : '0', color: '#fff' }
      case 'revenue': return { val: t.revenue > 0 ? t.revenue.toFixed(0) : '0', color: '#fff' }
      case 'roas': return { val: roas > 0 ? `${roas.toFixed(2)}x` : 'N/A', color: roas>=3?'#34d399':roas>=2?'#fbbf24':roas>0?'#f87171':'#555' }
      case 'cpa': return { val: t.purchases>0 ? t.spend/t.purchases>0?(t.spend/t.purchases).toFixed(0):'N/A' : 'N/A', color: '#fff' }
      case 'impressions': return { val: t.impressions.toLocaleString(), color: '#fff' }
      case 'clicks': return { val: t.clicks.toLocaleString(), color: '#fff' }
      case 'ctr': return { val: `${ctr.toFixed(2)}%`, color: ctr>=2?'#34d399':ctr>=1?'#fff':'#f87171' }
      case 'cpm': return { val: t.impressions>0?((t.spend/t.impressions)*1000).toFixed(2):'N/A', color: '#fff' }
      case 'reach': return { val: t.reach.toLocaleString(), color: '#fff' }
      case 'frequency': return { val: avgFreq.toFixed(2), color: avgFreq>4?'#f87171':'#fff' }
      case 'purchases': return { val: t.purchases.toString(), color: '#34d399' }
      default: return { val: 'N/A', color: '#555' }
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const newHistory = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newHistory)
    setChatLoading(true)
    const mt = getMetaTotals()
    const tt = getTiktokTotals()
    const context = `Meta Ads — الصرف: ${mt.spend.toFixed(0)} | ROAS: ${mt.spend>0?(mt.revenue/mt.spend).toFixed(2):0}x | مشتريات: ${mt.purchases} | حملات: ${insights.length}
TikTok Ads — الصرف: ${tt.spend.toFixed(0)} | ROAS: ${tt.spend>0?(tt.revenue/tt.spend).toFixed(2):0}x | مشتريات: ${tt.purchases}
المشاكل: ${issues.length} | ${issues.slice(0,3).map(i=>i.msg).join(' | ')}`
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context, history: chatMessages.slice(-6).map(m=>({role:m.role,content:m.content})) })
      })
      const d = await r.json()
      setChatMessages([...newHistory, { role: 'assistant', content: d.reply || 'حدث خطأ.' }])
    } catch { setChatMessages([...newHistory, { role: 'assistant', content: 'حدث خطأ في الاتصال.' }]) }
    setChatLoading(false)
  }

  function toggleMetric(key) {
    const updated = selectedMetrics.includes(key) ? selectedMetrics.filter(k=>k!==key) : [...selectedMetrics, key]
    setSelectedMetrics(updated)
    localStorage.setItem('selected_metrics', JSON.stringify(updated))
  }

  function logout() { localStorage.clear(); router.push('/') }

  const metaTotals = getMetaTotals()
  const tiktokTotals = getTiktokTotals()
  const currentTotals = activePlatform === 'tiktok' ? tiktokTotals : metaTotals
  const currentInsights = activePlatform === 'tiktok' ? tiktokInsights : insights

  const platforms = [
    { id: 'meta', label: 'Meta Ads', icon: 'M', color: '#1877F2', connected: true, spend: metaTotals.spend },
    { id: 'tiktok', label: 'TikTok', icon: 'T', color: '#fff', connected: !!tiktokToken, spend: tiktokTotals.spend },
    { id: 'google', label: 'Google Ads', icon: 'G', color: '#4285F4', connected: false, spend: 0 },
    { id: 'snapchat', label: 'Snapchat', icon: 'S', color: '#FFFC00', connected: false, spend: 0 },
  ]

  const quickDates = [{label:'أمس',days:1},{label:'7 أيام',days:7},{label:'14 يوم',days:14},{label:'شهر',days:30},{label:'3 أشهر',days:90}]

  return (
    <>
      <Head><title>AdsIQ Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;background:#0a0a14;color:#e0e0e0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .fade{animation:fadeIn .2s ease}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:4px}
        .nav-btn{background:transparent;border:none;padding:9px 12px;cursor:pointer;font-size:13px;border-radius:8px;display:flex;align-items:center;gap:8px;color:#555;width:100%;text-align:right;transition:all .15s}
        .nav-btn:hover{background:#161628;color:#aaa}
        .nav-btn.active{background:#1a1840;color:#a5b4fc;font-weight:600}
        .card{background:#111120;border-radius:14px;border:1px solid #1e1e3a}
        .stat-card{background:#111120;border-radius:12px;border:1px solid #1e1e3a;padding:16px;transition:border-color .2s;cursor:default}
        .stat-card:hover{border-color:#7F77DD}
        .btn-primary{background:linear-gradient(135deg,#7F77DD,#534AB7);color:#fff;border:none;border-radius:9px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
        .btn-primary:hover{opacity:.85;transform:translateY(-1px)}
        .btn-ghost{background:transparent;color:#666;border:1px solid #1e1e3a;border-radius:9px;padding:7px 14px;cursor:pointer;font-size:12px;transition:all .2s}
        .btn-ghost:hover{border-color:#534AB7;color:#a5b4fc}
        .badge{font-size:11px;padding:3px 8px;border-radius:5px;font-weight:600}
        input[type=date]{padding:6px 8px;border:1px solid #1e1e3a;border-radius:7px;font-size:11px;background:#0a0a14;color:#ccc;font-family:inherit}
        input[type=date]:focus{outline:none;border-color:#7F77DD}
        select{background:#0a0a14;color:#ccc;border:1px solid #1e1e3a;border-radius:7px;padding:6px 8px;font-size:12px;cursor:pointer;width:100%}
        select:focus{outline:none;border-color:#7F77DD}
        textarea:focus{outline:none;border-color:#7F77DD!important}
        .metric-toggle{padding:7px 12px;border-radius:7px;border:1px solid #1e1e3a;background:transparent;color:#666;font-size:12px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
        .metric-toggle.on{border-color:#534AB7;background:#1a1840;color:#a5b4fc}
        tr:hover td{background:#161628}
        .chat-ai{background:#161628;color:#e0e0e0;border-radius:14px;border-bottom-right-radius:3px}
        .chat-user{background:linear-gradient(135deg,#7F77DD,#534AB7);color:#fff;border-radius:14px;border-bottom-left-radius:3px}
        .platform-tab{padding:8px 14px;border-radius:8px;border:1px solid #1e1e3a;background:transparent;color:#555;font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;white-space:nowrap}
        .platform-tab.active{border-color:#534AB7;background:#1a1840;color:#a5b4fc}
        .platform-tab:hover{border-color:#534AB7;color:#a5b4fc}
      `}</style>

      <div style={{display:'flex',minHeight:'100vh'}}>
        {/* Sidebar */}
        <div style={{width:230,background:'#0d0d1a',borderLeft:'1px solid #161628',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',zIndex:10}}>
          <div style={{padding:'18px 16px',borderBottom:'1px solid #161628',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,background:'linear-gradient(135deg,#7F77DD,#534AB7)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none"><path d="M8 30L18 12L25 23L29 17L36 30H8Z" fill="white"/></svg>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>AdsIQ</div>
              <div style={{fontSize:10,color:'#333',letterSpacing:.3}}>Multi-Platform Analytics</div>
            </div>
          </div>

          {user && (
            <div style={{padding:'10px 14px',borderBottom:'1px solid #161628',display:'flex',alignItems:'center',gap:9}}>
              {user.picture?.data?.url
                ? <img src={user.picture.data.url} style={{width:30,height:30,borderRadius:'50%',border:'2px solid #1e1e3a'}}/>
                : <div style={{width:30,height:30,borderRadius:'50%',background:'#1a1840',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#a5b4fc'}}>{user.name?.[0]}</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
                <div style={{fontSize:10,color:'#1D9E75',display:'flex',alignItems:'center',gap:3}}><span style={{width:5,height:5,borderRadius:'50%',background:'#1D9E75',display:'inline-block'}}></span>متصل</div>
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <div style={{padding:'8px 12px',borderBottom:'1px solid #161628'}}>
              <div style={{fontSize:10,color:'#333',marginBottom:4,fontWeight:700,letterSpacing:.5}}>AD ACCOUNT</div>
              <select value={selectedAccount||''} onChange={e=>setSelectedAccount(e.target.value)}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div style={{padding:'8px 12px',borderBottom:'1px solid #161628'}}>
            <div style={{fontSize:10,color:'#333',marginBottom:5,fontWeight:700,letterSpacing:.5}}>الفترة الزمنية</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:10,color:'#444',minWidth:16}}>من</span>
                <input type="date" value={since} onChange={e=>setSince(e.target.value)} style={{flex:1}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:10,color:'#444',minWidth:16}}>إلى</span>
                <input type="date" value={until} onChange={e=>setUntil(e.target.value)} style={{flex:1}}/>
              </div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:2}}>
                {quickDates.map(({label,days})=>(
                  <button key={days} onClick={()=>{setSince(getDaysAgo(days));setUntil(getToday())}}
                    style={{fontSize:10,padding:'2px 6px',borderRadius:5,border:`1px solid ${since===getDaysAgo(days)?'#534AB7':'#1e1e3a'}`,background:since===getDaysAgo(days)?'#1a1840':'transparent',color:since===getDaysAgo(days)?'#a5b4fc':'#444',cursor:'pointer'}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{padding:'8px 12px',borderBottom:'1px solid #161628'}}>
            <div style={{fontSize:10,color:'#333',marginBottom:5,fontWeight:700,letterSpacing:.5}}>المنصات</div>
            {platforms.map(p=>(
              <div key={p.id} onClick={()=>{ if(p.connected) setActivePlatform(p.id); else if(p.id==='tiktok') connectTiktok() }}
                style={{display:'flex',alignItems:'center',gap:7,padding:'6px 8px',borderRadius:7,marginBottom:2,cursor:'pointer',background:activePlatform===p.id&&p.connected?'#1a1840':'transparent',border:activePlatform===p.id&&p.connected?'1px solid #534AB7':'1px solid transparent',transition:'all .15s'}}>
                <div style={{width:22,height:22,borderRadius:6,background:'#161628',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:p.color,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:activePlatform===p.id&&p.connected?'#a5b4fc':'#777'}}>{p.label}</div>
                  {p.connected && p.spend > 0 && <div style={{fontSize:10,color:'#444'}}>{p.spend.toFixed(0)} صرف</div>}
                </div>
                {p.connected
                  ? <span style={{width:5,height:5,borderRadius:'50%',background:'#1D9E75',flexShrink:0}}></span>
                  : <span style={{fontSize:9,color:'#444',background:'#161628',padding:'1px 5px',borderRadius:3,flexShrink:0}}>{p.id==='tiktok'?'ربط':'قريباً'}</span>
                }
              </div>
            ))}
          </div>

          <nav style={{padding:8,flex:1,overflowY:'auto'}}>
            {[
              {id:'overview',label:'نظرة عامة',icon:'📊'},
              {id:'campaigns',label:'الحملات',icon:'📢'},
              {id:'issues',label:`المشاكل${issues.length>0?` (${issues.length})`:''}`,icon:'⚠️'},
              {id:'chat',label:'الذكاء الاصطناعي',icon:'🤖'},
            ].map(item=>(
              <button key={item.id} className={`nav-btn${activeTab===item.id?' active':''}`} onClick={()=>setActiveTab(item.id)}>
                <span style={{fontSize:14}}>{item.icon}</span>{item.label}
                {item.id==='issues'&&issues.length>0&&<span style={{marginRight:'auto',background:'#3a0f0f',color:'#f87171',fontSize:10,padding:'1px 6px',borderRadius:8}}>{issues.length}</span>}
              </button>
            ))}
          </nav>

          <div style={{padding:10,borderTop:'1px solid #161628'}}>
            <button onClick={logout} className="btn-ghost" style={{width:'100%',justifyContent:'center'}}>تسجيل الخروج</button>
          </div>
        </div>

        {/* Main */}
        <div style={{marginRight:230,flex:1,padding:20,minHeight:'100vh',maxWidth:'calc(100vw - 230px)'}}>

          {/* Platform tabs */}
          <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto',paddingBottom:4}}>
            {platforms.filter(p=>p.connected).map(p=>(
              <button key={p.id} className={`platform-tab${activePlatform===p.id?' active':''}`} onClick={()=>setActivePlatform(p.id)}>
                <span style={{fontWeight:800,color:p.color}}>{p.icon}</span> {p.label}
                {p.spend > 0 && <span style={{fontSize:10,color:'#555',background:'#161628',padding:'1px 6px',borderRadius:4}}>{p.spend.toFixed(0)}</span>}
              </button>
            ))}
            {!tiktokToken && (
              <button className="platform-tab" onClick={connectTiktok} style={{borderStyle:'dashed',borderColor:'#2a2a4a'}}>
                <span style={{fontWeight:800,color:'#fff'}}>T</span> ربط TikTok
                <span style={{fontSize:10,color:'#534AB7'}}>+ اضافة</span>
              </button>
            )}
          </div>

          {/* OVERVIEW */}
          {activeTab==='overview' && (
            <div className="fade">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <h1 style={{fontSize:20,fontWeight:700,color:'#fff',marginBottom:2}}>نظرة عامة — {activePlatform==='meta'?'Meta Ads':'TikTok Ads'}</h1>
                  <p style={{fontSize:12,color:'#444'}}>{since} — {until}</p>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {loading && <div style={{width:16,height:16,border:'2px solid #1e1e3a',borderTop:'2px solid #7F77DD',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>}
                  <button className="btn-ghost" onClick={()=>setShowMetricsPicker(!showMetricsPicker)}>⚙️ المقاييس</button>
                </div>
              </div>

              {showMetricsPicker && (
                <div className="card" style={{padding:14,marginBottom:16}}>
                  <div style={{fontSize:12,color:'#888',marginBottom:10,fontWeight:600}}>اختار المقاييس اللي تظهر:</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                    {ALL_METRICS.map(m=>(
                      <button key={m.key} className={`metric-toggle${selectedMetrics.includes(m.key)?' on':''}`} onClick={()=>toggleMetric(m.key)}>
                        {m.icon} {m.label} {selectedMetrics.includes(m.key)&&<span style={{color:'#7F77DD',fontSize:10}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}}>
                {ALL_METRICS.filter(m=>selectedMetrics.includes(m.key)).map(metric=>{
                  const { val, color } = getStatValue(metric.key, currentTotals)
                  return (
                    <div key={metric.key} className="stat-card">
                      <div style={{fontSize:11,color:'#444',marginBottom:7,display:'flex',alignItems:'center',gap:4}}>{metric.icon} {metric.label}</div>
                      <div style={{fontSize:20,fontWeight:700,color}}>{val}</div>
                    </div>
                  )
                })}
              </div>

              {issues.length > 0 && (
                <div style={{background:'#140e00',border:'1px solid #3a2500',borderRadius:10,padding:12,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span>⚠️</span>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:600,fontSize:13,color:'#fb923c'}}>{issues.length} مشاكل مكتشفة</span>
                    <span style={{fontSize:11,color:'#555',marginRight:8}}>{issues.slice(0,2).map(i=>i.campaign).join('، ')}</span>
                  </div>
                  <button onClick={()=>setActiveTab('issues')} className="btn-ghost" style={{borderColor:'#3a2500',color:'#fb923c',flexShrink:0}}>عرض</button>
                </div>
              )}

              <div className="card" style={{overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #161628',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:13,color:'#ddd'}}>الحملات ({currentInsights.length})</span>
                  {loading && <span style={{fontSize:11,color:'#444',animation:'pulse 1s infinite'}}>جاري التحميل...</span>}
                </div>
                {currentInsights.length === 0 && !loading ? (
                  <div style={{padding:40,textAlign:'center'}}>
                    <div style={{fontSize:32,marginBottom:8}}>📭</div>
                    <div style={{color:'#444',fontSize:13}}>لا توجد بيانات في هذه الفترة</div>
                  </div>
                ) : (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr style={{background:'#0d0d1a'}}>
                          {['الحملة','الصرف','الإيرادات','ROAS','CTR','Freq','الحالة'].map(h=>(
                            <th key={h} style={{padding:'9px 12px',textAlign:'right',fontWeight:500,fontSize:11,color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentInsights.map((c,i)=>{
                          const isT = activePlatform === 'tiktok'
                          const sp = parseFloat(isT ? c.metrics?.spend : c.spend || 0)
                          const rv = parseFloat(isT ? c.metrics?.purchase_value : c.action_values?.find(a=>a.action_type==='purchase')?.value || 0)
                          const ro = sp > 0 ? rv/sp : 0
                          const fr = parseFloat(isT ? c.metrics?.frequency : c.frequency || 0)
                          const ct = parseFloat(isT ? c.metrics?.ctr : c.ctr || 0)
                          const nm = isT ? c.dimensions?.campaign_id : c.campaign_name
                          const rc = ro>=3?'#34d399':ro>=2?'#fbbf24':ro>0?'#f87171':'#555'
                          const st = ro===0?['N/A','#555']:ro>=3?['ممتاز','#34d399']:ro>=2?['متوسط','#fbbf24']:['ضعيف','#f87171']
                          return (
                            <tr key={i} style={{borderTop:'1px solid #161628'}}>
                              <td style={{padding:'10px 12px',fontWeight:500,color:'#bbb',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nm}</td>
                              <td style={{padding:'10px 12px',color:'#777'}}>{sp.toFixed(0)}</td>
                              <td style={{padding:'10px 12px',color:'#777'}}>{rv.toFixed(0)}</td>
                              <td style={{padding:'10px 12px',fontWeight:700,color:rc}}>{ro>0?`${ro.toFixed(2)}x`:'N/A'}</td>
                              <td style={{padding:'10px 12px',color:ct>2?'#34d399':'#777'}}>{ct.toFixed(2)}%</td>
                              <td style={{padding:'10px 12px',color:fr>4?'#f87171':'#777'}}>{fr>0?fr.toFixed(1):'-'}</td>
                              <td style={{padding:'10px 12px'}}><span className="badge" style={{background:`${st[1]}18`,color:st[1]}}>{st[0]}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CAMPAIGNS */}
          {activeTab==='campaigns' && (
            <div className="fade">
              <h1 style={{fontSize:20,fontWeight:700,color:'#fff',marginBottom:16}}>الحملات ({campaigns.length})</h1>
              <div style={{display:'grid',gap:8}}>
                {campaigns.length===0?(
                  <div className="card" style={{padding:40,textAlign:'center',color:'#444'}}>لا توجد حملات</div>
                ):campaigns.map((c,i)=>(
                  <div key={i} className="card" style={{padding:14,display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:c.status==='ACTIVE'?'#34d399':'#333',flexShrink:0}}></div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:'#ccc',marginBottom:2}}>{c.name}</div>
                      <div style={{fontSize:11,color:'#444'}}>{c.objective} · {c.status==='ACTIVE'?'نشطة':'موقوفة'}</div>
                    </div>
                    {c.daily_budget&&<div style={{fontSize:11,color:'#555',background:'#0a0a14',padding:'5px 10px',borderRadius:7,textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#333'}}>يومي</div>
                      <div style={{fontWeight:700,color:'#aaa'}}>{(c.daily_budget/100).toFixed(0)}</div>
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ISSUES */}
          {activeTab==='issues' && (
            <div className="fade">
              <h1 style={{fontSize:20,fontWeight:700,color:'#fff',marginBottom:16}}>المشاكل المكتشفة تلقائياً</h1>
              {issues.length===0?(
                <div className="card" style={{padding:48,textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:10}}>✅</div>
                  <div style={{fontSize:15,fontWeight:600,color:'#34d399',marginBottom:4}}>لا توجد مشاكل!</div>
                  <div style={{fontSize:12,color:'#444'}}>حملاتك تعمل بشكل جيد</div>
                </div>
              ):issues.map((issue,i)=>(
                <div key={i} style={{background:issue.level==='danger'?'#120808':'#120f00',border:`1px solid ${issue.level==='danger'?'#3a1010':'#3a2800'}`,borderRadius:12,padding:14,marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                    <span className="badge" style={{background:issue.level==='danger'?'#3a1010':'#3a2800',color:issue.level==='danger'?'#f87171':'#fbbf24'}}>
                      {issue.level==='danger'?'🔴 حرج':'🟡 تحذير'}
                    </span>
                    <span style={{fontSize:12,fontWeight:600,color:'#ccc',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{issue.campaign}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:5}}>{issue.msg}</div>
                  <div style={{fontSize:12,color:'#666',marginBottom:10}}>{issue.detail}</div>
                  <button onClick={()=>{setActiveTab('chat');setTimeout(()=>setChatInput(`ساعدني في حل: "${issue.campaign}" — ${issue.msg}`),100)}} className="btn-primary" style={{fontSize:11,padding:'5px 12px'}}>
                    🤖 اسأل الذكاء الاصطناعي
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CHAT */}
          {activeTab==='chat' && (
            <div className="fade" style={{height:'calc(100vh - 80px)',display:'flex',flexDirection:'column'}}>
              <div style={{marginBottom:12,flexShrink:0}}>
                <h1 style={{fontSize:20,fontWeight:700,color:'#fff',marginBottom:2}}>🤖 مساعد الذكاء الاصطناعي</h1>
                <p style={{fontSize:12,color:'#444'}}>يعرف بيانات Meta و TikTok الحقيقية</p>
              </div>
              <div className="card" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-start':'flex-end',gap:7}}>
                      {m.role==='assistant'&&<div style={{width:26,height:26,borderRadius:'50%',background:'#1a1840',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,marginTop:3}}>🤖</div>}
                      <div className={m.role==='user'?'chat-user':'chat-ai'} style={{maxWidth:'76%',padding:'10px 14px',fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:'flex',justifyContent:'flex-end',gap:7}}>
                      <div style={{width:26,height:26,borderRadius:'50%',background:'#1a1840',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>🤖</div>
                      <div className="chat-ai" style={{padding:'12px 16px',display:'flex',gap:4,alignItems:'center'}}>
                        {[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:'50%',background:'#7F77DD',animation:`pulse .8s ${j*.2}s infinite`}}></div>)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{padding:'8px 14px',borderTop:'1px solid #161628',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
                  {['حلل أداء حملاتي','أنهي الحملات اللي أوقفها؟','كيف أحسن الـ ROAS؟','قارن Meta و TikTok'].map((q,i)=>(
                    <button key={i} onClick={()=>setChatInput(q)}
                      style={{whiteSpace:'nowrap',padding:'4px 10px',borderRadius:16,border:'1px solid #1e1e3a',background:'transparent',color:'#555',fontSize:11,cursor:'pointer',flexShrink:0,transition:'all .15s'}}
                      onMouseOver={e=>{e.target.style.borderColor='#534AB7';e.target.style.color='#a5b4fc'}}
                      onMouseOut={e=>{e.target.style.borderColor='#1e1e3a';e.target.style.color='#555'}}>
                      {q}
                    </button>
                  ))}
                </div>
                <div style={{padding:'10px 14px',borderTop:'1px solid #161628',display:'flex',gap:7,background:'#0d0d1a'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}
                    placeholder="اسأل عن أي حملة أو مشكلة... (Enter للإرسال)"
                    rows={2} style={{flex:1,border:'1px solid #1e1e3a',borderRadius:10,padding:'9px 12px',fontSize:13,resize:'none',fontFamily:'inherit',direction:'rtl',background:'#0a0a14',color:'#e0e0e0'}}/>
                  <button onClick={sendChat} disabled={chatLoading} className="btn-primary" style={{padding:'0 16px',fontSize:18,borderRadius:10}}>←</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
