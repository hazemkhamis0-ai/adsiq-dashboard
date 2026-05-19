import Head from 'next/head'

export default function Terms() {
  return (
    <>
      <Head>
        <title>AdsIQ — Terms of Service</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a14;color:#e0e0e0;padding:40px 20px}
        .container{max-width:800px;margin:0 auto}
        h1{font-size:28px;font-weight:700;color:#fff;margin-bottom:8px}
        h2{font-size:18px;font-weight:600;color:#a5b4fc;margin:28px 0 10px}
        p{font-size:14px;line-height:1.8;color:#999;margin-bottom:12px}
        .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px}
        .logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#7F77DD,#534AB7);border-radius:10px;display:flex;align-items:center;justify-content:center}
        .logo-text{font-size:20px;font-weight:800;color:#fff}
        .date{font-size:12px;color:#555;margin-bottom:32px}
        hr{border:none;border-top:1px solid #1e1e3a;margin:24px 0}
      `}</style>
      <div className="container">
        <div className="logo">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M8 30L18 12L25 23L29 17L36 30H8Z" fill="white"/></svg>
          </div>
          <span className="logo-text">AdsIQ</span>
        </div>

        <h1>Terms of Service</h1>
        <p className="date">Last updated: May 2026</p>

        <p>By using AdsIQ Dashboard, you agree to these Terms of Service. Please read them carefully.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using AdsIQ Dashboard, you agree to be bound by these Terms of Service and our Privacy Policy.</p>

        <h2>2. Description of Service</h2>
        <p>AdsIQ Dashboard is an advertising analytics platform that connects to your advertising accounts (Meta, TikTok, Google Ads, Snapchat) to provide performance insights, AI-powered analysis, and campaign optimization recommendations.</p>

        <h2>3. Your Account & Data</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You grant AdsIQ permission to access your advertising data solely for the purpose of providing the service.</p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to misuse the service, attempt unauthorized access, or use the platform for any illegal purposes.</p>

        <h2>5. Disclaimer</h2>
        <p>AdsIQ provides analytics and recommendations for informational purposes only. We are not responsible for any business decisions made based on the data or AI recommendations provided.</p>

        <h2>6. Limitation of Liability</h2>
        <p>AdsIQ shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

        <h2>7. Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>

        <h2>8. Contact</h2>
        <p>For questions about these Terms, contact us at: <strong style={{color:'#a5b4fc'}}>support@adsiq-dashboard.vercel.app</strong></p>

        <hr />
        <p style={{fontSize:12,color:'#333',textAlign:'center'}}>© 2026 AdsIQ Dashboard. All rights reserved.</p>
      </div>
    </>
  )
}
