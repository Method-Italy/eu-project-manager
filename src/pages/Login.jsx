import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0f0e0c', fontFamily: 'Georgia, serif'
    }}>
      <div style={{
        background: '#141210', border: '1px solid #2e2820',
        borderRadius: 4, padding: '40px 48px', width: 360
      }}>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700,
          color: '#c9a84c', letterSpacing: '0.05em', marginBottom: 6
        }}>
          EU PROJECT MANAGER
        </div>
        <div style={{ fontSize: 12, color: '#5a5248', marginBottom: 32 }}>
          Accesso riservato
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 10, color: '#7a7268',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              fontFamily: 'sans-serif'
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', background: '#1a1814', border: '1px solid #2e2820',
                color: '#ddd8ce', padding: '9px 12px', borderRadius: 3,
                fontSize: 13, fontFamily: 'sans-serif', boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 10, color: '#7a7268',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              fontFamily: 'sans-serif'
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: '#1a1814', border: '1px solid #2e2820',
                color: '#ddd8ce', padding: '9px 12px', borderRadius: 3,
                fontSize: 13, fontFamily: 'sans-serif', boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(168,80,80,0.1)', border: '1px solid rgba(168,80,80,0.3)',
              borderRadius: 3, padding: '8px 12px', marginBottom: 16,
              fontSize: 12, color: '#a85050', fontFamily: 'sans-serif'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: '#c9a84c', color: '#0f0e0c',
              border: 'none', padding: '10px', borderRadius: 3,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'sans-serif', letterSpacing: '0.08em',
              textTransform: 'uppercase', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'ACCESSO...' : 'ACCEDI'}
          </button>
        </form>
      </div>
    </div>
  )
}