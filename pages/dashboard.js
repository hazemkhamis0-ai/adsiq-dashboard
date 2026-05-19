import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const ALL_METRICS = [
  { key: 'spend', label: 'الصرف', icon: '💰', format: v => `${parseFloat(v||0).toFixed(0)}` },
  { key: 'revenue', label: 'الإيرادات', icon: '💵', format: (v,c) => `${parseFloat(c?.action_values?.find(a=>a.action_type==='purchase')?.value||0).toFixed(0)}` },
  { key: 'roas', label: 'ROAS', icon: '📈', format: (v,c) => { const s=parseFloat(c?.spend||0); const r=parseFloat(c?.action_values?.find(a=>a.action_type==='purchase')?.value||0); return s>0?`${(r/s).toFixed(2)}x`:'N/A' } },
  { key: 'cpa', label: 'CPA', icon: '🎯', format: (v,c) => { const s=parseFloat(c?.spend||0); const p=parseInt(c?.actions?.find(a=>a.action_type==='purchase')?.value||0); return p>0?`${(s/p).toFixed(0)}`:'N/A' } },
  { key: 'impressions', label: 'Impressions', icon: '👁️', format: v => parseInt(v||0).toLocaleString() },
  { key: 'clicks', label: 'Clicks', icon: '🖱️', format: v => parseInt(v||0).toLocaleString() },
  { key: 'ctr', label: 'CTR', icon: '📊', format: v => `${parseFloat(v||0).toFixed(2)}%` },
  { key: 'cpm', label: 'CPM', icon: '📉', format: v => `${parseFloat(v||0).toFixed(2)}` },
  { key: 'reach', label: 'Reach', icon: '🌍', format: v => parseInt(v||0).toLocaleString() },
  { key: 'frequency', label: 'Frequency', icon: '🔄', format: v => parseFloat(v||0).toFixed(2) },
  { key: 'purchases', label: 'Purchases', icon: '🛒', format: (v,c) => c?.actions?.find(a=>a.action_type==='purchase')?.value||'0' },
  { key: 'cpp', label: 'CPP', icon: '💲', format: v => `${parseFloat(v||0).toFixed(2)}` },
]

const DEFAULT_METRICS = ['spend','revenue','roas','cpa','ctr','frequency']

function getDaysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
function getToday() { return new Date().toISOString().split('T')[0] }

export default function Dashboard() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [insights, setInsights] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [since, setSince] = useState(getDaysAgo(7))
  const [until, setUntil] = useState(getToday())
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_METRICS)
  const [showMetricsPicker, setShowMetricsPicker] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'أهلاً! أنا مساعدك الذكي 🤖\n\nبياناتك محملة وجاهز أساعدك في:\n• تحليل أداء حملاتك\n• اكتشاف المشاكل والحلول\n• توصيات الميزانية\n• أي سؤال بيزنس تاني' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [issues, setIssues] = useState([])
  const [activePlatform, setActivePlatform] = useState('meta')
  const chatEndRef = useRef(null)

  useEffect(() => {
    const urlToken = router.query.token
    const savedToken = localStorage.getItem('meta_access_token')
    const t = urlToken || savedToken
    if (!t) { router.push('/'); return }
    if (urlToken) { localStorage.setItem('meta_access_token', urlToken); router.replace('/dashboard') }
    setToken(t)
    const saved = localStorage.getItem('selected_metrics')
    if (saved) setSelectedMetrics(JSON.parse(saved))
  }, [router.query.token])

  useEffect(() => { if (!token) return; fetchUser(); fetchAccounts() }, [token])
  useEffect(() => { if (selectedAccount) { fetchInsights(); fetchCampaigns() } }, [selectedAccount, since, until])
  useEffect(() => { if (insights.length > 0) detectIssues() }, [insights])
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

  function detectIssues() {
    const found = []
    insights.forEach(c => {
      const spend = parseFloat(c.spend || 0)
      const roas = parseFloat(c.purchase_roas?.[0]?.value || 0)
      const freq = parseFloat(c.frequency || 0)
      const ctr = parseFloat(c.ctr || 0)
      const purchases = parseInt(c.actions?.find(a => a.action_type === 'purchase')?.value || 0)
      if (roas > 0 && roas < 2) found.push({ level: 'danger', campaign: c.campaign_name, msg: `ROAS منخفض جداً (${roas.toFixed(1)}x)`, detail: 'راجع الجمهور أو صفحة الهبوط — الحملة قد تكون خسارة' })
      if (freq > 4) found.push({ level: 'warn', campaign: c.campaign_name, msg: `Audience Fatigue — Frequency وصلت ${freq.toFixed(1)}`, detail: 'الجمهور شاف الإعلان كتير، غير الـ Creative أو وسّع الجمهور' })
      if (ctr > 0 && ctr < 0.5) found.push({ level: 'warn', campaign: c.campaign_name, msg: `CTR ضعيف جداً (${ctr.toFixed(2)}%)`, detail: 'الإعلان مش بيجذب — غير الصورة أو الـ Headline' })
      if (spend > 0 && purchases === 0 && roas === 0) found.push({ level: 'danger', campaign: c.campaign_name, msg: `صرف بدون أي تحويلات`, detail: `صرفت ${spend.toFixed(0)} ولا purchase واحدة — تأكد من إعداد الـ Pixel` })
    })
    setIssues(found)
  }

  function getTotals() {
    return insights.reduce((acc, c) => {
      acc.spend += parseFloat(c.spend || 0)
      acc.impressions += parseInt(c.impressions || 0)
      acc.clicks += parseInt(c.clicks || 0)
      acc.purchases += parseInt(c.actions?.find(a => a.action_type === 'purchase')?.value || 0)
      acc.revenue += parseFloat(c.action_values?.find(a => a.action_type === 'purchase')?.value || 0)
      acc.reach += parseInt(c.reach || 0)
      return acc
    }, { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, reach: 0 })
  }

  function toggleMetric(key) {
    const updated = selectedMetrics.includes(key)
      ? selectedMetrics.filter(k => k !== key)
      : [...selectedMetrics, key]
    setSelectedMetrics(updated)
    localStorage.setItem('selected_metrics', JSON.stringify(updated))
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const newHistory = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newHistory)
    setChatLoading(true)
    const t = getTotals()
    const roas = t.spend > 0 ? t.revenue / t.spend : 0
    const context = `Meta Ads — الفترة: ${since} إلى ${until}
الصرف: ${t.spend.toFixed(0)} | الإيرادات: ${t.revenue.toFixed(0)} | ROAS: ${roas.toFixed(2)}x
المشتريات: ${t.purchases} | Impressions: ${t.impressions.toLocaleString()} | Clicks: ${t.clicks.toLocaleString()}
عدد الحملات: ${insights.length} | المشاكل المكتشفة: ${issues.length}
${issues.length > 0 ? 'المشاكل: ' + issues.map(i => i.msg).join(' | ') : ''}
أفضل 3 حملات: ${insights.sort((a,b)=>parseFloat(b.purchase_roas?.[0]?.value||0)-parseFloat(a.purchase_roas?.[0]?.value||0)).slice(0,3).map(c=>`${c.campaign_name}(ROAS:${parseFloat(c.purchase_roas?.[0]?.value||0).toFixed(1)}x)`).join(', ')}`
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context, history: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })) })
      })
      const d = await r.json()
      setChatMessages([...newHistory, { role: 'assistant', content: d.reply || 'حدث خطأ.' }])
    } catch { setChatMessages([...newHistory, { role: 'assistant', content: 'حدث خطأ في الاتصال.' }]) }
    setChatLoading(false)
  }

  const totals = getTotals()
  const globalRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0
  const globalCpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0
  const globalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

  function logout() { localStorage.removeItem('meta_access_token'); router.push('/') }

  const platforms = [
    { id: 'meta', label: 'Meta Ads', icon: 'M', color: '#1877F2', bg: '#e8f0fe', connected: true },
    { id: 'tiktok', label: 'TikTok Ads', icon: 'T', color: '#fff', bg: '#010101', connected: false },
    { id: 'google', label: 'Google Ads', icon: 'G', color: '#4285F4', bg: '#e8f0fe', connected: false },
    { id: 'snapchat', label: 'Snapchat', icon: 'S', color: '#FFFC00', bg: '#1a1a00', connected: false },
  ]

  const quickDates = [
    { label: 'أمس', days: 1 },
    { label: '7 أيام', days: 7 },
    { label: '14 يوم', days: 14 },
    { label: 'شهر', days: 30 },
    { label: '3 أشهر', days: 90 },
  ]

  return (
    <>
      <Head><title>AdsIQ Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;background:#0f0f1a;color:#e0e0e0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .fade{animation:fadeIn .25s ease}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:4px}
        .nav-btn{background:transparent;border:none;padding:10px 14px;cursor:pointer;font-size:13px;border-radius:10px;display:flex;align-items:center;gap:8px;color:#666;width:100%;text-align:right;transition:all .15s;white-space:nowrap}
        .nav-btn:hover{background:#1a1a2e;color:#aaa}
        .nav-btn.active{background:#1e1b4b;color:#a5b4fc;font-weight:600}
        .card{background:#1a1a2e;border-radius:16px;border:1px solid #2a2a4a}
        .stat-card{background:#1a1a2e;border-radius:14px;border:1px solid #2a2a4a;padding:18px;transition:border-color .2s}
        .stat-card:hover{border-color:#534AB7}
        .btn-primary{background:linear-gradient(135deg,#7F77DD,#534AB7);color:#fff;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;display:flex;align-items:center;gap:6px}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px)}
        .btn-ghost{background:transparent;color:#888;border:1px solid #2a2a4a;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:12px;transition:all .2s}
        .btn-ghost:hover{border-color:#534AB7;color:#a5b4fc}
        .badge{font-size:11px;padding:3px 8px;border-radius:6px;font-weight:600}
        input[type=date]{padding:7px 10px;border:1px solid #2a2a4a;border-radius:8px;font-size:12px;background:#0f0f1a;color:#e0e0e0;font-family:inherit}
        input[type=date]:focus{outline:none;border-color:#7F77DD}
        textarea:focus{outline:none;border-color:#7F77DD!important}
        select{background:#0f0f1a;color:#e0e0e0;border:1px solid #2a2a4a;border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer}
        select:focus{outline:none;border-color:#7F77DD}
        .metric-toggle{padding:8px 12px;border-radius:8px;border:1px solid #2a2a4a;background:transparent;color:#888;font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
        .metric-toggle.on{border-color:#7F77DD;background:#1e1b4b;color:#a5b4fc}
        .platform-card{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:border-color .2s}
        .platform-card:hover{border-color:#534AB7}
        tr:hover td{background:#1e1b4b}
        .chat-bubble-ai{background:#1e1b4b;color:#e0e0e0;border-radius:16px;border-bottom-right-radius:4px}
        .chat-bubble-user{background:linear-gradient(135deg,#7F77DD,#534AB7);color:#fff;border-radius:16px;border-bottom-left-radius:4px}
        .loading-dot{width:8px;height:8px;border-radius:50%;background:#7F77DD;animation:pulse .8s infinite}
        .issue-danger{background:#1a0a0a;border:1px solid #4a1515;border-radius:12px;padding:16px;margin-bottom:12px}
        .issue-warn{background:#1a1400;border:1px solid #4a3800;border-radius:12px;padding:16px;margin-bottom:12px}
      `}</style>

      <div style={{display:'flex',minHeight:'100vh'}}>
        {/* Sidebar */}
        <div style={{width:240,background:'#13131f',borderLeft:'1px solid #1e1e3a',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',zIndex:10,overflow:'hidden'}}>
          
          {/* Logo */}
          <div style={{padding:'20px 16px',borderBottom:'1px solid #1e1e3a',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#7F77DD,#534AB7)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M8 30L18 12L25 23L29 17L36 30H8Z" fill="white"/></svg>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>AdsIQ</div>
              <div style={{fontSize:10,color:'#555'}}>Analytics Dashboard</div>
            </div>
          </div>

          {/* User */}
          {user && (
            <div style={{padding:'12px 16px',borderBottom:'1px solid #1e1e3a',display:'flex',alignItems:'center',gap:10}}>
              {user.picture?.data?.url
                ? <img src={user.picture.data.url} style={{width:32,height:32,borderRadius:'50%',border:'2px solid #2a2a4a'}} />
                : <div style={{width:32,height:32,borderRadius:'50%',background:'#1e1b4b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#a5b4fc'}}>{user.name?.[0]}</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'#ddd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
                <div style={{fontSize:10,color:'#555',display:'flex',alignItems:'center',gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'#1D9E75',display:'inline-block'}}></span>متصل</div>
              </div>
            </div>
          )}

          {/* Account selector */}
          {accounts.length > 0 && (
            <div style={{padding:'10px 12px',borderBottom:'1px solid #1e1e3a'}}>
              <div style={{fontSize:10,color:'#444',marginBottom:5,fontWeight:700,letterSpacing:.5}}>AD ACCOUNT</div>
              <select value={selectedAccount||''} onChange={e=>setSelectedAccount(e.target.value)} style={{width:'100%'}}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Date range */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid #1e1e3a'}}>
            <div style={{fontSize:10,color:'#444',marginBottom:6,fontWeight:700,letterSpacing:.5}}>الفترة الزمنية</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:'#555',minWidth:18}}>من</span>
                <input type="date" value={since} onChange={e=>setSince(e.target.value)} style={{flex:1}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:'#555',minWidth:18}}>إلى</span>
                <input type="date" value={until} onChange={e=>setUntil(e.target.value)} style={{flex:1}}/>
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:3}}>
                {quickDates.map(({label,days})=>(
                  <button key={days} onClick={()=>{setSince(getDaysAgo(days));setUntil(getToday())}}
                    style={{fontSize:10,padding:'3px 7px',borderRadius:6,border:`1px solid ${since===getDaysAgo(days)?'#7F77DD':'#2a2a4a'}`,background:since===getDaysAgo(days)?'#1e1b4b':'transparent',color:since===getDaysAgo(days)?'#a5b4fc':'#555',cursor:'pointer'}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid #1e1e3a'}}>
            <div style={{fontSize:10,color:'#444',marginBottom:6,fontWeight:700,letterSpacing:.5}}>المنصات</div>
            {platforms.map(p=>(
              <div key={p.id} onClick={()=>p.connected&&setActivePlatform(p.id)}
                style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:8,marginBottom:3,cursor:p.connected?'pointer':'default',background:activePlatform===p.id?'#1e1b4b':'transparent',opacity:p.connected?1:.4}}>
                <div style={{width:22,height:22,borderRadius:6,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:p.color,flexShrink:0,border:'1px solid #2a2a4a'}}>{p.icon}</div>
                <span style={{fontSize:12,color:activePlatform===p.id?'#a5b4fc':'#888',flex:1}}>{p.label}</span>
                {p.connected
                  ? <span style={{width:6,height:6,borderRadius:'50%',background:'#1D9E75',flexShrink:0}}></span>
                  : <span style={{fontSize:9,color:'#444',background:'#1a1a2e',padding:'1px 5px',borderRadius:4}}>قريباً</span>
                }
              </div>
            ))}
          </div>

          {/* Nav */}
          <nav style={{padding:8,flex:1,overflowY:'auto'}}>
            <div style={{fontSize:10,color:'#333',padding:'6px 8px 4px',fontWeight:700,letterSpacing:.5}}>التنقل</div>
            {[
              {id:'overview',label:'نظرة عامة',icon:'📊'},
              {id:'campaigns',label:'الحملات',icon:'📢'},
              {id:'issues',label:`المشاكل${issues.length>0?` (${issues.length})`:''}`,icon:'⚠️'},
              {id:'chat',label:'الذكاء الاصطناعي',icon:'🤖'},
            ].map(item=>(
              <button key={item.id} className={`nav-btn${activeTab===item.id?' active':''}`} onClick={()=>setActiveTab(item.id)}>
                <span style={{fontSize:14}}>{item.icon}</span>{item.label}
                {item.id==='issues'&&issues.length>0&&<span style={{marginRight:'auto',background:'#4a1515',color:'#f87171',fontSize:10,padding:'1px 6px',borderRadius:10}}>{issues.length}</span>}
              </button>
            ))}
          </nav>

          <div style={{padding:12,borderTop:'1px solid #1e1e3a'}}>
            <button onClick={logout} style={{width:'100%',padding:'8px',fontSize:12,color:'#444',background:'transparent',border:'1px solid #1e1e3a',borderRadius:8,cursor:'pointer',transition:'all .2s'}}
              onMouseOver={e=>e.target.style.color='#f87171'} onMouseOut={e=>e.target.style.color='#444'}>
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{marginRight:240,flex:1,padding:24,minHeight:'100vh',maxWidth:'calc(100vw - 240px)'}}>

          {/* OVERVIEW */}
          {activeTab==='overview' && (
            <div className="fade">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <div>
                  <h1 style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:3}}>نظرة عامة</h1>
                  <p style={{fontSize:13,color:'#555'}}>{since} — {until} · Meta Ads</p>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {loading && <div style={{width:18,height:18,border:'2px solid #2a2a4a',borderTop:'2px solid #7F77DD',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>}
                  <button className="btn-ghost" onClick={()=>setShowMetricsPicker(!showMetricsPicker)}>
                    ⚙️ تخصيص المقاييس
                  </button>
                </div>
              </div>

              {/* Metrics Picker */}
              {showMetricsPicker && (
                <div className="card" style={{padding:16,marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#aaa',marginBottom:12}}>اختار المقاييس اللي تظهر في الداشبورد:</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {ALL_METRICS.map(m=>(
                      <button key={m.key} className={`metric-toggle${selectedMetrics.includes(m.key)?' on':''}`}
                        onClick={()=>toggleMetric(m.key)}>
                        {m.icon} {m.label}
                        {selectedMetrics.includes(m.key) && <span style={{color:'#7F77DD'}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
                {ALL_METRICS.filter(m=>selectedMetrics.includes(m.key)).map(metric=>{
                  let value = '0'
                  const t = totals
                  if(metric.key==='spend') value = `${t.spend.toFixed(0)}`
                  else if(metric.key==='revenue') value = `${t.revenue.toFixed(0)}`
                  else if(metric.key==='roas') { value = t.spend>0?`${(t.revenue/t.spend).toFixed(2)}x`:'N/A' }
                  else if(metric.key==='cpa') { value = t.purchases>0?`${(t.spend/t.purchases).toFixed(0)}`:'N/A' }
                  else if(metric.key==='impressions') value = t.impressions.toLocaleString()
                  else if(metric.key==='clicks') value = t.clicks.toLocaleString()
                  else if(metric.key==='ctr') value = `${globalCtr.toFixed(2)}%`
                  else if(metric.key==='reach') value = t.reach.toLocaleString()
                  else if(metric.key==='purchases') value = t.purchases.toString()
                  else if(metric.key==='cpm') { const imp=t.impressions; value = imp>0?`${((t.spend/imp)*1000).toFixed(2)}`:'N/A' }
                  else if(metric.key==='frequency') { const avgFreq = insights.length>0?(insights.reduce((s,c)=>s+parseFloat(c.frequency||0),0)/insights.length):0; value = avgFreq.toFixed(2) }
                  else if(metric.key==='cpp') { value = t.purchases>0?`${(t.spend/t.purchases).toFixed(2)}`:'N/A' }

                  const isGood = (metric.key==='roas'&&parseFloat(value)>=3)||(metric.key==='ctr'&&parseFloat(value)>=2)
                  const isBad = (metric.key==='roas'&&parseFloat(value)>0&&parseFloat(value)<2)
                  return (
                    <div key={metric.key} className="stat-card">
                      <div style={{fontSize:11,color:'#555',marginBottom:8,display:'flex',alignItems:'center',gap:5}}>
                        {metric.icon} {metric.label}
                      </div>
                      <div style={{fontSize:22,fontWeight:700,color:isGood?'#34d399':isBad?'#f87171':'#fff',marginBottom:3}}>{value}</div>
                    </div>
                  )
                })}
              </div>

              {/* Issues banner */}
              {issues.length>0 && (
                <div style={{background:'#1a0f0a',border:'1px solid #4a2500',borderRadius:12,padding:14,marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:20}}>⚠️</span>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:600,fontSize:13,color:'#fb923c'}}>{issues.length} مشاكل مكتشفة تلقائياً</span>
                    <span style={{fontSize:12,color:'#666',marginRight:8}}>{issues.slice(0,2).map(i=>i.campaign).join('، ')}</span>
                  </div>
                  <button onClick={()=>setActiveTab('issues')} className="btn-ghost" style={{flexShrink:0,borderColor:'#4a2500',color:'#fb923c'}}>عرض الكل</button>
                </div>
              )}

              {/* Campaigns table */}
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{padding:'14px 18px',borderBottom:'1px solid #2a2a4a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:14,color:'#ddd'}}>الحملات ({insights.length})</span>
                  {loading&&<span style={{fontSize:12,color:'#555',animation:'pulse 1s infinite'}}>جاري التحميل...</span>}
                </div>
                {insights.length===0&&!loading?(
                  <div style={{padding:48,textAlign:'center'}}>
                    <div style={{fontSize:36,marginBottom:10}}>📭</div>
                    <div style={{color:'#555',fontSize:14}}>لا توجد بيانات في هذه الفترة</div>
                    <div style={{color:'#333',fontSize:12,marginTop:4}}>جرب تغيير الفترة الزمنية</div>
                  </div>
                ):(
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <thead>
                        <tr style={{background:'#13131f'}}>
                          {['الحملة','الصرف','الإيرادات','ROAS','CTR','Freq','الحالة'].map(h=>(
                            <th key={h} style={{padding:'10px 14px',textAlign:'right',fontWeight:500,fontSize:11,color:'#555',whiteSpace:'nowrap'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insights.map((c,i)=>{
                          const sp=parseFloat(c.spend||0)
                          const rv=parseFloat(c.action_values?.find(a=>a.action_type==='purchase')?.value||0)
                          const ro=sp>0?rv/sp:0
                          const fr=parseFloat(c.frequency||0)
                          const ct=parseFloat(c.ctr||0)
                          const roColor=ro>=3?'#34d399':ro>=2?'#fbbf24':ro>0?'#f87171':'#555'
                          const st=ro===0?['N/A','#555']:ro>=3?['ممتاز','#34d399']:ro>=2?['متوسط','#fbbf24']:['ضعيف','#f87171']
                          return(
                            <tr key={i} style={{borderTop:'1px solid #1e1e3a',cursor:'pointer'}}>
                              <td style={{padding:'12px 14px',fontWeight:500,color:'#ccc',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.campaign_name}</td>
                              <td style={{padding:'12px 14px',color:'#888'}}>{sp.toFixed(0)}</td>
                              <td style={{padding:'12px 14px',color:'#888'}}>{rv.toFixed(0)}</td>
                              <td style={{padding:'12px 14px',fontWeight:700,color:roColor}}>{ro>0?`${ro.toFixed(2)}x`:'N/A'}</td>
                              <td style={{padding:'12px 14px',color:ct>2?'#34d399':ct>1?'#888':'#f87171'}}>{ct.toFixed(2)}%</td>
                              <td style={{padding:'12px 14px',color:fr>4?'#f87171':'#888'}}>{fr>0?fr.toFixed(1):'-'}</td>
                              <td style={{padding:'12px 14px'}}><span className="badge" style={{background:`${st[1]}20`,color:st[1]}}>{st[0]}</span></td>
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
              <h1 style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:20}}>الحملات ({campaigns.length})</h1>
              <div style={{display:'grid',gap:10}}>
                {campaigns.length===0?(
                  <div className="card" style={{padding:40,textAlign:'center',color:'#555'}}>لا توجد حملات</div>
                ):campaigns.map((c,i)=>(
                  <div key={i} className="card" style={{padding:16,display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:c.status==='ACTIVE'?'#34d399':'#444',flexShrink:0}}></div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,color:'#ddd',marginBottom:3}}>{c.name}</div>
                      <div style={{fontSize:12,color:'#555'}}>{c.objective} · {c.status==='ACTIVE'?'🟢 نشطة':'⚫ موقوفة'}</div>
                    </div>
                    {c.daily_budget&&<div style={{textAlign:'left',fontSize:12,color:'#666',background:'#0f0f1a',padding:'6px 10px',borderRadius:8}}>
                      <div style={{fontSize:10,color:'#444'}}>يومي</div>
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
              <h1 style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:20}}>المشاكل المكتشفة تلقائياً</h1>
              {issues.length===0?(
                <div className="card" style={{padding:48,textAlign:'center'}}>
                  <div style={{fontSize:40,marginBottom:12}}>✅</div>
                  <div style={{fontSize:16,fontWeight:600,color:'#34d399',marginBottom:4}}>لا توجد مشاكل!</div>
                  <div style={{fontSize:13,color:'#555'}}>حملاتك تعمل بشكل جيد في هذه الفترة</div>
                </div>
              ):issues.map((issue,i)=>(
                <div key={i} className={issue.level==='danger'?'issue-danger':'issue-warn'}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span className="badge" style={{background:issue.level==='danger'?'#4a1515':'#3d2800',color:issue.level==='danger'?'#f87171':'#fbbf24'}}>
                      {issue.level==='danger'?'🔴 حرج':'🟡 تحذير'}
                    </span>
                    <span style={{fontSize:13,fontWeight:600,color:'#ddd',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{issue.campaign}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:6}}>{issue.msg}</div>
                  <div style={{fontSize:13,color:'#888',marginBottom:12}}>{issue.detail}</div>
                  <button onClick={()=>{setActiveTab('chat');setTimeout(()=>setChatInput(`ساعدني في حل مشكلة حملة "${issue.campaign}": ${issue.msg}`),200)}}
                    className="btn-primary" style={{fontSize:12,padding:'6px 14px'}}>
                    🤖 اسأل الذكاء الاصطناعي
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CHAT */}
          {activeTab==='chat' && (
            <div className="fade" style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column'}}>
              <div style={{marginBottom:16,flexShrink:0}}>
                <h1 style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:3}}>🤖 مساعد الذكاء الاصطناعي</h1>
                <p style={{fontSize:13,color:'#555'}}>يعرف بياناتك الحقيقية ويساعدك في أي قرار</p>
              </div>
              <div className="card" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-start':'flex-end',gap:8}}>
                      {m.role==='assistant'&&<div style={{width:28,height:28,borderRadius:'50%',background:'#1e1b4b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,marginTop:4}}>🤖</div>}
                      <div className={m.role==='user'?'chat-bubble-user':'chat-bubble-ai'}
                        style={{maxWidth:'75%',padding:'12px 16px',fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'#1e1b4b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>🤖</div>
                      <div className="chat-bubble-ai" style={{padding:'14px 18px',display:'flex',gap:5,alignItems:'center'}}>
                        {[0,1,2].map(j=><div key={j} className="loading-dot" style={{animationDelay:`${j*.2}s`}}></div>)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                
                {/* Quick suggestions */}
                <div style={{padding:'8px 16px',borderTop:'1px solid #1e1e3a',display:'flex',gap:8,overflowX:'auto',flexShrink:0}}>
                  {['حلل أداء حملاتي','أنهي الحملات اللي أوقفها؟','كيف أحسن الـ ROAS؟','توزيع الميزانية المثالي'].map((q,i)=>(
                    <button key={i} onClick={()=>setChatInput(q)}
                      style={{whiteSpace:'nowrap',padding:'5px 12px',borderRadius:20,border:'1px solid #2a2a4a',background:'transparent',color:'#666',fontSize:12,cursor:'pointer',flexShrink:0,transition:'all .2s'}}
                      onMouseOver={e=>{e.target.style.borderColor='#7F77DD';e.target.style.color='#a5b4fc'}}
                      onMouseOut={e=>{e.target.style.borderColor='#2a2a4a';e.target.style.color='#666'}}>
                      {q}
                    </button>
                  ))}
                </div>

                <div style={{padding:'12px 16px',borderTop:'1px solid #1e1e3a',display:'flex',gap:8,background:'#13131f'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}
                    placeholder="اسأل عن أي حملة أو مشكلة بيزنس... (Enter للإرسال)"
                    rows={2} style={{flex:1,border:'1px solid #2a2a4a',borderRadius:12,padding:'10px 14px',fontSize:14,resize:'none',fontFamily:'inherit',direction:'rtl',background:'#0f0f1a',color:'#e0e0e0'}}/>
                  <button onClick={sendChat} disabled={chatLoading}
                    className="btn-primary" style={{padding:'0 18px',fontSize:20,borderRadius:12}}>←</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
