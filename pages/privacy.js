import Head from 'next/head'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>AdsIQ — Privacy Policy</title>
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

        <h1>Privacy Policy</h1>
        <p className="date">Last updated: May 2026</p>

        <p>AdsIQ Dashboard ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our advertising analytics platform.</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide when connecting your advertising accounts, including:</p>
        <p>• <strong style={{color:'#ddd'}}>Account credentials:</strong> OAuth tokens from Meta (Facebook/Instagram), TikTok, Google Ads, and Snapchat — used solely to fetch your advertising data.</p>
        <p>• <strong style={{color:'#ddd'}}>Advertising data:</strong> Campaign performance metrics, spend, impressions, clicks, conversions, and ROAS data from connected platforms.</p>
        <p>• <strong style={{color:'#ddd'}}>Profile information:</strong> Your name and account ID from connected platforms for identification purposes.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information exclusively to:</p>
        <p>• Display your advertising performance data in the AdsIQ dashboard</p>
        <p>• Provide AI-powered analysis and recommendations for your campaigns</p>
        <p>• Detect performance issues and optimization opportunities</p>
        <p>We do NOT sell, share, or use your data for any advertising or third-party purposes.</p>

        <h2>3. Data Storage & Security</h2>
        <p>Your access tokens are stored securely in an encrypted database. We implement industry-standard security measures to protect your data from unauthorized access, alteration, or disclosure.</p>
        <p>Access tokens are only used to make API calls on your behalf and are never shared with third parties.</p>

        <h2>4. Data Retention</h2>
        <p>We retain your data for as long as your account is active. You can request deletion of your data at any time by contacting us.</p>

        <h2>5. Third-Party Platforms</h2>
        <p>AdsIQ connects to third-party advertising platforms (Meta, TikTok, Google, Snapchat) via their official APIs. Your use of these platforms is governed by their respective privacy policies and terms of service.</p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <p>• Access the personal data we hold about you</p>
        <p>• Request correction or deletion of your data</p>
        <p>• Disconnect your advertising accounts at any time</p>
        <p>• Revoke OAuth permissions directly from the platform settings</p>

        <h2>7. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at: <strong style={{color:'#a5b4fc'}}>privacy@adsiq-dashboard.vercel.app</strong></p>

        <hr />
        <p style={{fontSize:12,color:'#333',textAlign:'center'}}>© 2026 AdsIQ Dashboard. All rights reserved.</p>
      </div>
    </>
  )
}
