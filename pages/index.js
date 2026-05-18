import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('meta_access_token')
    if (token) router.push('/dashboard')
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
      <Head>
        <title>AdsIQ Dashboard — تسجيل الدخول</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="#7F77DD"/>
              <path d="M10 28L18 14L24 22L28 18L34 28H10Z" fill="white" opacity="0.9"/>
            </svg>
            <span style={styles.logoText}>AdsIQ</span>
          </div>
          <h1 style={styles.title}>مرحباً بك</h1>
          <p style={styles.subtitle}>سجل دخول بحساب Meta الخاص بك للوصول لبيانات إعلاناتك</p>

          <button onClick={handleMetaLogin} disabled={loading} style={styles.metaBtn}>
            {loading ? (
              <span>جاري التوجيه...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>تسجيل الدخول بـ Facebook</span>
              </>
            )}
          </button>

          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📊</span>
              <span>تحليل كل حملاتك تلقائياً</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🤖</span>
              <span>ذكاء اصطناعي يكتشف المشاكل</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>💬</span>
              <span>استشارة فورية في مشاكل بيزنسك</span>
            </div>
          </div>

          <p style={styles.note}>
            🔒 البيانات محمية ولا نخزن أي بيانات حساسة
          </p>
        </div>
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    direction: 'rtl',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(127,119,221,0.15)',
    textAlign: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '24px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#534AB7',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 28px',
    lineHeight: '1.6',
  },
  metaBtn: {
    background: '#1877F2',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '28px',
    transition: 'background 0.2s',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    textAlign: 'right',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: '#f8f7ff',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#444',
  },
  featureIcon: { fontSize: '16px' },
  note: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
  },
}
