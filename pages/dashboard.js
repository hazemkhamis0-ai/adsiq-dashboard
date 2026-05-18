import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

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
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'أهلاً! أنا مساعدك الذكي لتحليل إعلاناتك. بياناتك محملة — اسألني عن أي حملة أو مشكلة!' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [issues, setIssues] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    const urlToken = router.query.token
    const savedToken = localStorage.getItem('meta_access_token')
    const t = urlToken || savedToken
    if (!t) { router.push('/'); return }
    if (urlToken) { localStorage.setItem('meta_access_token', urlToken); router.replace('/dashboard') }
    setToken(t)
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
      if (roas > 0 && roas < 2) found.push({ level: 'danger', campaign: c.campaign_name, msg: `ROAS منخفض (${roas.toFixed(1)}x)`, detail: 'راجع الجمهور أو صفحة الهبوط', spend })
      if (freq > 4) found.push({ level: 'warn', campaign: c.campaign_name, msg: `Audience Fatigue — Frequency ${freq.toFixed(1)}`, detail: 'الجمهور شاف الإعلان كتير، غير الـ Creative', spend })
      if (ctr > 0 && ctr < 0.5) found.push({ level: 'warn', campaign: c.campaign_name, msg: `CTR ضعيف (${ctr.toFixed(2)}%)`, detail: 'غير الصورة أو الكوبي', spend })
      if (spend > 0 && purchases === 0 && roas === 0) found.push({ level: 'danger', campaign: c.campaign_name, msg: `صرف بدون تحويلات`, detail: `صرفت ${spend.toFixed(0)} ولا purchase — تأكد من الـ Pixel`, spend })
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
      return acc
    }, { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 })
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const newHistory = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newHistory)
    setChatLoading(true)
    const totals = getTotals()
    const context = `الصرف: ${totals.spend.toFixed(2)} | الإيرادات: ${totals.revenue.toFixed(2)} | ROAS: ${totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : 0}x | المشتريات: ${totals.purchases} | الحملات: ${insights.length} | المشاكل: ${issues.length}`
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
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0
  const cpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

  function logout() { localStorage.removeItem('meta_access_token'); router.push('/') }

  const navItems = [
    { id: 'overview', label: 'نظرة عامة', icon: '📊' },
    { id: 'campaigns', label: 'الحملات', icon: '📢' },
    { id: 'issues', label: `المشاكل${issues.length > 0 ? ` (${issues.length})` : ''}`, icon: '⚠️' },
    { id: 'chat', label: 'الذكاء الاصطناعي', icon: '🤖' },
  ]

  return (
    <>
      <Head><title>AdsIQ — لوحة التحكم</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;background:#f0eeff}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeIn .25s ease}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c5c0ef;border-radius:4px}
        .nav-btn{background:transparent;border:none;padding:10px 14px;cursor:pointer;font-size:13px;border-radius:10px;display:flex;align-items:center;gap:8px;color:#666;width:100%;text-align:right;transition:all .15s}
        .nav-btn:hover{background:#f0eeff;color:#534AB7}
        .nav-btn.active{background:#eeecff;color:#534AB7;font-weight:600}
        .card{background:#fff;border-radius:14px;border:1px solid #ede9fe}
        .stat{background:#f8f7ff;border-radius:12px;padding:16px}
        .badge{font-size:11px;padding:3px 8px;border-radius:6px;font-weight:600}
        input[type=date]{padding:7px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;background:#fff;color:#333;font-family:inherit}
        input[type=date]:focus{outline:none;border-color:#7F77DD}
        textarea:focus{outline:none;border-color:#7F77DD!important}
        .btn-ai{background:#7F77DD;color:#fff;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600;transition:background .2s}
        .btn-ai:hover{background:#534AB7}
        tr:hover td{background:#faf9ff}
      `}</style>

      <div style={{display:'flex',minHeight:'100vh'}}>
        {/* Sidebar */}
        <div style={{width:230,background:'#fff',borderLeft:'1px solid #ede9fe',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',zIndex:10}}>
          <div style={{padding:'18px 16px',borderBottom:'1px solid #ede9fe',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,background:'linear-gradient(135deg,#7F77DD,#534AB7)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none"><path d="M8 30L18 12L25 23L29 17L36 30H8Z" fill="white"/></svg>
            </div>
            <span style={{fontWeight:700,fontSize:17,color:'#534AB7'}}>AdsIQ</span>
          </div>

          {user && (
            <div style={{padding:'12px 16px',borderBottom:'1px solid #ede9fe',display:'flex',alignItems:'center',gap:10}}>
              {user.picture?.data?.url
                ? <img src={user.picture.data.url} style={{width:34,height:34,borderRadius:'50%',border:'2px solid #ede9fe'}} />
                : <div style={{width:34,height:34,borderRadius:'50%',background:'#ede9fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#7F77DD'}}>{user.name?.[0]}</div>
              }
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#333'}}>{user.name}</div>
                <div style={{fontSize:11,color:'#999'}}>Meta Ads ✓</div>
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <div style={{padding:'10px 12px',borderBottom:'1px solid #ede9fe'}}>
              <div style={{fontSize:11,color:'#aaa',marginBottom:5,fontWeight:600}}>AD ACCOUNT</div>
              <select value={selectedAccount||''} onChange={e=>setSelectedAccount(e.target.value)}
                style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'#fff',cursor:'pointer'}}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid #ede9fe'}}>
            <div style={{fontSize:11,color:'#aaa',marginBottom:6,fontWeight:600}}>الفترة الزمنية</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'#888',minWidth:20}}>من</span>
                <input type="date" value={since} onChange={e=>setSince(e.target.value)} style={{flex:1,fontSize:12}} />
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'#888',minWidth:20}}>إلى</span>
                <input type="date" value={until} onChange={e=>setUntil(e.target.value)} style={{flex:1,fontSize:12}} />
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2}}>
                {[['7','7 أيام'],['14','14 يوم'],['30','شهر'],['90','3 أشهر']].map(([d,label])=>(
                  <button key={d} onClick={()=>{setSince(getDaysAgo(parseInt(d)));setUntil(getToday())}}
                    style={{fontSize:10,padding:'3px 7px',borderRadius:6,border:'1px solid #e0e0e0',background:since===getDaysAgo(parseInt(d))?'#ede9fe':'#fff',color:since===getDaysAgo(parseInt(d))?'#534AB7':'#666',cursor:'pointer'}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <nav style={{padding:8,flex:1,overflowY:'auto'}}>
            <div style={{fontSize:11,color:'#bbb',padding:'8px 8px 4px',fontWeight:700,letterSpacing:.5}}>القائمة</div>
            {navItems.map(item=>(
              <button key={item.id} className={`nav-btn${activeTab===item.id?' active':''}`} onClick={()=>setActiveTab(item.id)}>
                <span style={{fontSize:15}}>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>

          <div style={{padding:12,borderTop:'1px solid #ede9fe'}}>
            <button onClick={logout} style={{width:'100%',padding:'8px',fontSize:12,color:'#999',background:'transparent',border:'1px solid #eee',borderRadius:8,cursor:'pointer'}}>
              🚪 تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{marginRight:230,flex:1,padding:24,minHeight:'100vh',maxWidth:'calc(100vw - 230px)'}}>

          {/* OVERVIEW */}
          {activeTab==='overview' && (
            <div className="fade">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <h1 style={{fontSize:20,fontWeight:700,color:'#1a1a2e'}}>نظرة عامة على الأداء</h1>
                {loading && <div style={{width:20,height:20,border:'3px solid #ede9fe',borderTop:'3px solid #7F77DD',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
                {[
                  {label:'إجمالي الصرف',value:totals.spend>0?`${totals.spend.toFixed(0).toLocaleString()}`:'0',sub:'جنيه / ريال',color:'#534AB7'},
                  {label:'ROAS',value:roas>0?`${roas.toFixed(2)}x`:'N/A',sub:roas>=3?'✅ ممتاز':roas>=2?'⚠️ متوسط':roas>0?'❌ منخفض':'لا توجد بيانات',color:roas>=3?'#0F6E56':roas>=2?'#BA7517':'#A32D2D'},
                  {label:'المشتريات',value:totals.purchases.toString(),sub:'تحويل مؤكد',color:'#0F6E56'},
                  {label:'متوسط CPA',value:cpa>0?`${cpa.toFixed(0)}`:'N/A',sub:'تكلفة الشراء',color:'#534AB7'},
                ].map((s,i)=>(
                  <div key={i} className="stat">
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{s.label}</div>
                    <div style={{fontSize:26,fontWeight:700,color:'#1a1a2e',marginBottom:4}}>{s.value}</div>
                    <div style={{fontSize:12,color:s.color}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                {[
                  {label:'الإيرادات',value:totals.revenue>0?`${totals.revenue.toFixed(0).toLocaleString()}`:'0'},
                  {label:'Impressions',value:totals.impressions>0?totals.impressions.toLocaleString():'0'},
                  {label:'CTR',value:`${ctr.toFixed(2)}%`},
                ].map((s,i)=>(
                  <div key={i} className="stat">
                    <div style={{fontSize:12,color:'#888',marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:20,fontWeight:700,color:'#333'}}>{s.value}</div>
                  </div>
                ))}
              </div>

              {issues.length>0 && (
                <div style={{background:'#fff8f0',border:'1px solid #ffe0c0',borderRadius:12,padding:16,marginBottom:20}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>⚠️ {issues.length} مشكلة تحتاج اهتمامك</div>
                  {issues.slice(0,3).map((issue,i)=>(
                    <div key={i} style={{fontSize:13,padding:'5px 0',borderBottom:i<2?'1px solid #ffe0c0':'none',color:'#555'}}>
                      <span style={{color:issue.level==='danger'?'#A32D2D':'#BA7517',fontWeight:600}}>{issue.campaign}</span> — {issue.msg}
                    </div>
                  ))}
                  <button onClick={()=>setActiveTab('issues')} style={{marginTop:8,fontSize:12,color:'#7F77DD',background:'transparent',border:'none',cursor:'pointer',fontWeight:600}}>عرض كل المشاكل ←</button>
                </div>
              )}

              <div className="card" style={{overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid #ede9fe',fontWeight:600,fontSize:14,color:'#333',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>أداء الحملات ({insights.length})</span>
                  {insights.length===0&&!loading&&<span style={{fontSize:12,color:'#999'}}>لا توجد بيانات للفترة المحددة</span>}
                </div>
                {loading?(
                  <div style={{padding:40,textAlign:'center',color:'#aaa'}}>جاري تحميل البيانات...</div>
                ):insights.length===0?(
                  <div style={{padding:40,textAlign:'center'}}>
                    <div style={{fontSize:32,marginBottom:8}}>📭</div>
                    <div style={{color:'#888',fontSize:14}}>لا توجد حملات في هذه الفترة</div>
                    <div style={{color:'#aaa',fontSize:12,marginTop:4}}>جرب تغيير الفترة الزمنية</div>
                  </div>
                ):(
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <thead>
                        <tr style={{background:'#faf9ff'}}>
                          {['الحملة','الصرف','الإيرادات','ROAS','CTR','Frequency','الحالة'].map(h=>(
                            <th key={h} style={{padding:'10px 12px',textAlign:'right',fontWeight:500,fontSize:12,color:'#888'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insights.map((c,i)=>{
                          const spend=parseFloat(c.spend||0)
                          const rev=parseFloat(c.action_values?.find(a=>a.action_type==='purchase')?.value||0)
                          const roasV=spend>0?rev/spend:0
                          const freq=parseFloat(c.frequency||0)
                          const ctrV=parseFloat(c.ctr||0)
                          const st=roasV===0?['N/A','#888']:roasV>=3?['ممتاز','#0F6E56']:roasV>=2?['متوسط','#BA7517']:['ضعيف','#A32D2D']
                          return(
                            <tr key={i} style={{borderTop:'1px solid #f5f5f5'}}>
                              <td style={{padding:'10px 12px',fontWeight:500,color:'#333',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.campaign_name}</td>
                              <td style={{padding:'10px 12px',color:'#555'}}>{spend.toFixed(0)}</td>
                              <td style={{padding:'10px 12px',color:'#555'}}>{rev.toFixed(0)}</td>
                              <td style={{padding:'10px 12px',fontWeight:600,color:roasV>=3?'#0F6E56':roasV>=2?'#BA7517':roasV>0?'#A32D2D':'#888'}}>{roasV>0?`${roasV.toFixed(2)}x`:'N/A'}</td>
                              <td style={{padding:'10px 12px',color:ctrV>2?'#0F6E56':'#555'}}>{ctrV.toFixed(2)}%</td>
                              <td style={{padding:'10px 12px',color:freq>4?'#A32D2D':'#555'}}>{freq>0?freq.toFixed(1):'-'}</td>
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
              <h1 style={{fontSize:20,fontWeight:700,color:'#1a1a2e',marginBottom:20}}>الحملات ({campaigns.length})</h1>
              <div style={{display:'grid',gap:10}}>
                {campaigns.length===0?(
                  <div className="card" style={{padding:40,textAlign:'center',color:'#aaa'}}>لا توجد حملات</div>
                ):campaigns.map((c,i)=>(
                  <div key={i} className="card" style={{padding:16,display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:c.status==='ACTIVE'?'#1D9E75':'#ccc',flexShrink:0}}></div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,color:'#333',marginBottom:3}}>{c.name}</div>
                      <div style={{fontSize:12,color:'#888'}}>الهدف: {c.objective} · {c.status==='ACTIVE'?'🟢 نشطة':'⚫ موقوفة'}</div>
                    </div>
                    {c.daily_budget&&<div style={{textAlign:'left',fontSize:12,color:'#666'}}>يومي<br/><strong>{(c.daily_budget/100).toFixed(0)}</strong></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ISSUES */}
          {activeTab==='issues' && (
            <div className="fade">
              <h1 style={{fontSize:20,fontWeight:700,color:'#1a1a2e',marginBottom:20}}>المشاكل المكتشفة تلقائياً</h1>
              {issues.length===0?(
                <div className="card" style={{padding:40,textAlign:'center'}}>
                  <div style={{fontSize:40,marginBottom:10}}>✅</div>
                  <div style={{fontSize:16,fontWeight:600,color:'#0F6E56',marginBottom:4}}>لا توجد مشاكل!</div>
                  <div style={{fontSize:13,color:'#888'}}>حملاتك تعمل بشكل جيد في هذه الفترة</div>
                </div>
              ):issues.map((issue,i)=>(
                <div key={i} style={{background:issue.level==='danger'?'#fff5f5':'#fffbf0',border:`1px solid ${issue.level==='danger'?'#F7C1C1':'#FAC775'}`,borderRadius:12,padding:16,marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span className="badge" style={{background:issue.level==='danger'?'#FCEBEB':'#FAEEDA',color:issue.level==='danger'?'#A32D2D':'#854F0B'}}>
                      {issue.level==='danger'?'🔴 حرج':'🟡 تحذير'}
                    </span>
                    <span style={{fontSize:13,fontWeight:600,color:'#333',flex:1}}>{issue.campaign}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:'#222',marginBottom:4}}>{issue.msg}</div>
                  <div style={{fontSize:13,color:'#666',marginBottom:10}}>{issue.detail}</div>
                  <button onClick={()=>{setActiveTab('chat');setTimeout(()=>setChatInput(`ساعدني في حل مشكلة "${issue.campaign}": ${issue.msg}`),100)}}
                    className="btn-ai" style={{fontSize:12,padding:'6px 14px'}}>
                    🤖 اسأل الذكاء الاصطناعي
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CHAT */}
          {activeTab==='chat' && (
            <div className="fade" style={{height:'calc(100vh - 48px)',display:'flex',flexDirection:'column'}}>
              <h1 style={{fontSize:20,fontWeight:700,color:'#1a1a2e',marginBottom:16,flexShrink:0}}>🤖 مساعد الذكاء الاصطناعي</h1>
              <div className="card" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-start':'flex-end'}}>
                      <div style={{maxWidth:'78%',padding:'12px 16px',borderRadius:14,fontSize:14,lineHeight:1.7,
                        background:m.role==='user'?'#f5f3ff':'#7F77DD',
                        color:m.role==='user'?'#333':'#fff',
                        borderBottomRightRadius:m.role==='user'?14:3,
                        borderBottomLeftRadius:m.role==='assistant'?14:3,
                        whiteSpace:'pre-wrap'}}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:'flex',justifyContent:'flex-end'}}>
                      <div style={{background:'#f0eeff',borderRadius:14,padding:'12px 18px',display:'flex',gap:5,alignItems:'center'}}>
                        {[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:'50%',background:'#7F77DD',animation:`spin .8s ${j*.2}s infinite`}}></div>)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{padding:'14px 16px',borderTop:'1px solid #ede9fe',display:'flex',gap:8,background:'#faf9ff',borderRadius:'0 0 14px 14px'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}
                    placeholder="اسأل عن أي حملة أو مشكلة بيزنس... (Enter للإرسال)"
                    rows={2} style={{flex:1,border:'1px solid #e0e0e0',borderRadius:10,padding:'10px 14px',fontSize:14,resize:'none',fontFamily:'inherit',direction:'rtl',background:'#fff'}}/>
                  <button onClick={sendChat} disabled={chatLoading} className="btn-ai" style={{padding:'0 18px',fontSize:20,borderRadius:10}}>←</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

function getToday() { return new Date().toISOString().split('T')[0] }
function getDaysAgo(days) {
  const d=new Date(); d.setDate(d.getDate()-days); return d.toISOString().split('T')[0]
}
