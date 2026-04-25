import React, { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import api from '../services/api'

const DEMO_ACCOUNTS = [
  { label: 'Admin-Tashini',   email: 'admin@campus.edu', role: 'ADMIN'   },
  { label: 'Staff',   email: 'bob@campus.edu',   role: 'STAFF'   },
  { label: 'Student', email: 'alice@campus.edu', role: 'STUDENT' },
  { label: 'Student', email: 'carol@campus.edu', role: 'STUDENT' },
]

const ROLE_COLOR = { ADMIN: '#4f6ef7', STAFF: '#8b5cf6', STUDENT: '#059669' }

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email,    setEmail]   = useState('')
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    api.get('/auth/google')
      .then((res) => setGoogleEnabled(Boolean(res.data?.enabled)))
      .catch(() => setGoogleEnabled(false))
  }, [])

  const resolveRole = (emailVal, roleVal) => {
    if (roleVal) return roleVal
    const normalizedEmail = emailVal.trim().toLowerCase()
    const matchedDemo = DEMO_ACCOUNTS.find((account) => account.email.toLowerCase() === normalizedEmail)
    return matchedDemo?.role || 'STUDENT'
  }

  const doLogin = async (emailVal, roleVal) => {
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/login-or-register', {
        email: emailVal.trim(),
        name: emailVal.trim().split('@')[0],
        role: resolveRole(emailVal, roleVal),
      })
      login(res.data)
      navigate('/dashboard')
    } catch (err) {
      const message = err?.message || err.response?.data?.message || 'Login failed'
      setError(message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (searchParams.get('oauth') !== 'success' || !googleEnabled) return
    setLoading(true)
    api.get('/auth/me')
      .then((res) => {
        login(res.data)
        navigate('/dashboard')
      })
      .catch(() => setError('Google sign-in failed. Please try again.'))
      .finally(() => {
        setLoading(false)
        setSearchParams({})
      })
  }, [searchParams, setSearchParams, login, navigate, googleEnabled])

  const signInWithGoogle = () => {
    if (!googleEnabled) {
      setError('Google sign-in is not configured on this server.')
      return
    }
    setLoading(true)
    setError('')
    // Navigate directly to the OAuth2 authorization endpoint (proxied to backend)
    window.location.href = '/oauth2/authorization/google'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #f0f3ff 0%, #f5f0ff 50%, #f0f7ff 100%)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px', background: 'linear-gradient(150deg, #4f6ef7 0%, #8b5cf6 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', top: -100, left: -100 }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', bottom: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: 80, left: 40 }} />

        <div style={{ position: 'relative', textAlign: 'center', color: '#fff', maxWidth: 340 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <Building2 size={34} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 12 }}>
            UniOps
          </h1>
          <p style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.6 }}>
            Manage campus resources, bookings, and incidents - all in one place.
          </p>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Resource Booking', 'Incident Tickets', 'Real-time Notifications'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 420, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 40px',
        background: '#fff',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 6 }}>
            Sign in
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Enter your campus email to continue</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Email address
          </label>
          <input
            type="email"
            className="form-control"
            placeholder="you@campus.edu"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && email && doLogin(email)}
            autoFocus
          />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '9px 13px', color: '#dc2626',
            fontSize: 13, marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={() => email && doLogin(email)}
          disabled={loading || !email}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14 }}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
        {googleEnabled ? (
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, marginTop: 10 }}
          >
            Sign In with Google
          </button>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            Google sign-in is disabled in local mode.
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 600, letterSpacing: '.06em' }}>DEMO ACCOUNTS</span>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              onClick={() => doLogin(acc.email, acc.role)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                background: '#fafafa', border: '1px solid #f3f4f6',
                borderRadius: 9, transition: 'all .15s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = ROLE_COLOR[acc.role]; e.currentTarget.style.background = '#f9faff' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.background = '#fafafa' }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{acc.email}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                background: `${ROLE_COLOR[acc.role]}18`, color: ROLE_COLOR[acc.role],
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}