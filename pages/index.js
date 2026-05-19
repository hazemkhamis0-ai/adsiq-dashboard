import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('meta_access_token')) router.push('/dashboard')
  }, [])

  const handleMetaLogin = () => {
    setLoading(true)
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`)
    const scope = encodeURIComponent('ads_read,ads_management,business_management')
    const state = Math.random().toString(36).substring(7)
    localStorage.setItem('oauth_state', state)
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`
  }

  return (
    <>
      <Head><title>AdsIQ — تسجيل الدخول</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;background:#0f0f1a;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .card{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:24px;padding:48px 40px;width:100%;max-width:440px;text-align:center}
        .logo{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:32px}
        .logo-icon{width:48px;height:48px;background:linear-gradient(135deg,#7F77DD,#534AB7);border-radius:14px;display:flex;align-items:center;justify-content:center}
        .logo-text{font-size:26px;font-weight:800;color:#fff}
        h1{font-size:28px;font-weight:700;color:#fff;margin-bottom:8px}
        p{font-size:15px;color:#888;margin-bottom:32px;line-height:1.6}
        .meta-btn{background:#1877F2;color:#fff;border:none;border-radius:14px;padding:16px 24px;font-size:15px;font-weight:600;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;transition:all .2s}
        .meta-btn:hover{background:#0d6efd;transform:translateY(-1px)}
        .tiktok-btn{background:#1a1a2e;color:#fff;border:1px solid #333;border-radius:14px;padding:14px 24px;font-size:14px;font-weight:500;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;transition:all .2s;opacity:.6}
        .tiktok-btn:hover{border-color:#555;opacity:.8}
        .features{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
        .feature{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#0f0f1a;border-radius:12px;font-size:13px;color:#aaa;text-align:right}
        .note{font-size:12px;color:#555}
        .coming{font-size:10px;background:#2a2a4a;color:#666;padding:2px 8px;border-radius:20px;margin-right:auto}
      `}</style>
      <div style={{padding:20,width:'100%',display:'flex',justifyContent:'center'}}>
        <div className="card">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none"><path d="M8 30L18 12L25 23L29 17L36 30H8Z" fill="white"/></svg>
            </div>
            <span className="logo-text">AdsIQ</span>
          </div>
          <h1>مرحباً بك</h1>
          <p>منصة تحليل الإعلانات الذكية — كل منصاتك في مكان واحد</p>
          <button onClick={handleMetaLogin} disabled={loading} className="meta-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            {loading ? 'جاري التوجيه...' : 'دخول بـ Facebook / Meta'}
          </button>
          <button className="tiktok-btn" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
            دخول بـ TikTok
            <span className="coming">قريباً</span>
          </button>
          <div className="features">
            {['📊 تحليل تلقائي لكل حملاتك','🤖 ذكاء اصطناعي يكتشف المشاكل','⚡ تقارير فورية بأي فترة زمنية','🎯 اختيار الـ Metrics اللي تهمك'].map((f,i)=>(
              <div key={i} className="feature"><span>{f}</span></div>
            ))}
          </div>
          <p className="note">🔒 بياناتك آمنة — لا نخزن أي معلومات حساسة</p>
        </div>
      </div>
    </>
  )
}
