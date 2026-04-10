import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const PROGRAM_COLORS = {
  'Creative Europe': { bg: '#f0ebf7', color: '#6b4c9a', border: '#d8cce8' },
  'Erasmus+': { bg: '#e6eef7', color: '#2b5ea7', border: '#c4d6ed' },
  'Interreg': { bg: '#e8f0e7', color: '#2d5a27', border: '#c4dcc2' },
  default: { bg: '#f5f3ef', color: '#6b6b6b', border: '#e2dfd8' },
}

const STATUS_MAP = {
  draft: { label: 'Bozza', color: '#999' },
  submitted: { label: 'Inviato', color: '#c47a20' },
  approved: { label: 'Approvato', color: '#2d5a27' },
  ongoing: { label: 'In corso', color: '#2b5ea7' },
  completed: { label: 'Completato', color: '#6b4c9a' },
  rejected: { label: 'Respinto', color: '#b94040' },
}

export default function Dashboard({ session }) {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({ total: 0, ongoing: 0, upcoming: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('progetti')
        .select(`
          *,
          programmi ( nome ),
          partner ( id, nome, ruolo )
        `)
        .order('data_inizio', { ascending: false })

      if (error) throw error

      setProjects(data || [])
      setStats({
        total: data?.length || 0,
        ongoing: data?.filter(p => p.stato === 'ongoing').length || 0,
        upcoming: data?.filter(p => 
          p.stato === 'approved' || p.stato === 'submitted'
        ).length || 0,
      })
    } catch (err) {
      console.error('Fetch projects error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    supabase.auth.signOut()
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('it-IT', {
      month: 'short',
      year: 'numeric',
    })
  }

  function getProgress(project) {
    if (!project.data_inizio || !project.data_fine) return null
    const start = new Date(project.data_inizio).getTime()
    const end = new Date(project.data_fine).getTime()
    const now = Date.now()
    if (now < start) return 0
    if (now > end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>I tuoi Progetti</h1>
          <p style={styles.subtitle}>
            {session.user.email}
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Esci
        </button>
      </header>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{stats.total}</span>
          <span style={styles.statLabel}>Totale progetti</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #2b5ea7' }}>
          <span style={{ ...styles.statNumber, color: '#2b5ea7' }}>{stats.ongoing}</span>
          <span style={styles.statLabel}>In corso</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #c47a20' }}>
          <span style={{ ...styles.statNumber, color: '#c47a20' }}>{stats.upcoming}</span>
          <span style={styles.statLabel}>In pipeline</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBanner}>
          <strong>Errore:</strong> {error}
          <button onClick={fetchProjects} style={styles.retryBtn}>Riprova</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingWrap}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Caricamento progetti...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📁</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
            Nessun progetto
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            I progetti inseriti nel database appariranno qui.
          </p>
        </div>
      )}

      {/* Project cards */}
      <div style={styles.grid}>
        {projects.map(project => {
          const programName = project.programmi?.nome || project.programma
          const colors = PROGRAM_COLORS[programName] || PROGRAM_COLORS.default
          const status = STATUS_MAP[project.stato] || { label: project.stato, color: '#999' }
          const progress = getProgress(project)
          const partnerCount = project.partner?.length || 0
          const coordinator = project.partner?.find(p => p.ruolo === 'coordinatore')

          return (
            <div
              key={project.id}
              style={styles.card}
              onClick={() => navigate(`/project/${project.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Top bar */}
              <div style={styles.cardTop}>
                <span style={{
                  ...styles.programBadge,
                  background: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.border}`,
                }}>
                  {programName || 'N/D'}
                </span>
                <span style={{
                  ...styles.statusDot,
                  background: status.color,
                }} title={status.label} />
              </div>

              {/* Acronym & title */}
              <h2 style={styles.cardAcronym}>
                {project.acronimo || project.titolo}
              </h2>
              {project.acronimo && project.titolo && (
                <p style={styles.cardTitle}>{project.titolo}</p>
              )}

              {/* Progress bar */}
              {progress !== null && project.stato === 'ongoing' && (
                <div style={styles.progressWrap}>
                  <div style={styles.progressTrack}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${progress}%`,
                    }} />
                  </div>
                  <span style={styles.progressLabel}>{progress}%</span>
                </div>
              )}

              {/* Meta */}
              <div style={styles.cardMeta}>
                <span style={styles.metaItem}>
                  📅 {formatDate(project.data_inizio)} → {formatDate(project.data_fine)}
                </span>
                {project.budget_totale && (
                  <span style={styles.metaItem}>
                    💰 €{Number(project.budget_totale).toLocaleString('it-IT')}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div style={styles.cardFooter}>
                {coordinator && (
                  <span style={styles.footerItem}>
                    🏛️ {coordinator.nome}
                  </span>
                )}
                <span style={styles.footerItem}>
                  👥 {partnerCount} partner
                </span>
                <span style={{
                  ...styles.statusLabel,
                  color: status.color,
                }}>
                  {status.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Styles ── */
const styles = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: 14,
    marginTop: 4,
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 16px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-sm)',
    borderLeft: '3px solid var(--accent)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 140,
  },
  statNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--accent)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  errorBanner: {
    background: 'var(--red-light)',
    color: 'var(--red)',
    padding: '12px 16px',
    borderRadius: 'var(--radius)',
    marginBottom: 24,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  retryBtn: {
    marginLeft: 'auto',
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '64px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 0',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  programBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  cardAcronym: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  cardTitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    background: 'var(--border-light)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    minWidth: 32,
    textAlign: 'right',
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 16px',
    marginTop: 4,
  },
  metaItem: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTop: '1px solid var(--border-light)',
    marginTop: 4,
  },
  footerItem: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 'auto',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
}
