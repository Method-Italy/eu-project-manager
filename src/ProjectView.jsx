import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

/* ── Tab configuration ── */
const TABS = [
  { id: 'overview', label: 'Panoramica', icon: '📊' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'deliverable', label: 'Deliverable', icon: '📦' },
  { id: 'partner', label: 'Partner', icon: '👥' },
  { id: 'log', label: 'Log', icon: '📝' },
  { id: 'reporting', label: 'Reporting', icon: '📋' },
]

const STATUS_COLORS = {
  pending: '#c47a20',
  'in progress': '#2b5ea7',
  'in_progress': '#2b5ea7',
  completed: '#2d5a27',
  done: '#2d5a27',
  overdue: '#b94040',
  late: '#b94040',
  draft: '#999',
  submitted: '#6b4c9a',
  approved: '#2d5a27',
}

export default function ProjectView({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [project, setProject] = useState(null)
  const [data, setData] = useState({
    partner: [],
    work_packages: [],
    tasks: [],
    deliverable: [],
    eventi: [],
    milestones: [],
    log: [],
    reporting: [],
    persone: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [id])

  async function fetchAll() {
    try {
      setLoading(true)
      setError(null)

      // Fetch project
      const { data: proj, error: projErr } = await supabase
        .from('progetti')
        .select('*, programmi ( nome )')
        .eq('id', id)
        .single()
      if (projErr) throw projErr
      setProject(proj)

      // Fetch all related data in parallel
      const queries = {
        partner: supabase.from('partner').select('*, persone(*)').eq('progetto_id', id),
        work_packages: supabase.from('work_packages').select('*').eq('progetto_id', id).order('numero', { ascending: true }),
        tasks: supabase.from('tasks').select('*, task_partner(*)').eq('progetto_id', id).order('data_inizio', { ascending: true }),
        deliverable: supabase.from('deliverable').select('*').eq('progetto_id', id).order('scadenza', { ascending: true }),
        eventi: supabase.from('eventi').select('*').eq('progetto_id', id).order('data_inizio', { ascending: true }),
        milestones: supabase.from('milestones').select('*').eq('progetto_id', id).order('scadenza', { ascending: true }),
        log: supabase.from('log').select('*').eq('progetto_id', id).order('created_at', { ascending: false }),
        reporting: supabase.from('reporting').select('*').eq('progetto_id', id).order('data_scadenza', { ascending: true }),
      }

      const results = {}
      await Promise.all(
        Object.entries(queries).map(async ([key, query]) => {
          const { data: d, error: e } = await query
          if (e) console.warn(`Error fetching ${key}:`, e.message)
          results[key] = d || []
        })
      )

      setData(results)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Caricamento progetto...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={s.errorWrap}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Progetto non trovato</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px' }}>{error}</p>
        <button onClick={() => navigate('/')} style={s.backBtn}>← Dashboard</button>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button onClick={() => navigate('/')} style={s.backLink}>
          ← Dashboard
        </button>
        <div style={s.headerMain}>
          <div>
            <span style={s.programLabel}>
              {project.programmi?.nome || project.programma}
            </span>
            <h1 style={s.projectName}>
              {project.acronimo || project.titolo}
            </h1>
            {project.acronimo && project.titolo && (
              <p style={s.projectTitle}>{project.titolo}</p>
            )}
          </div>
          <div style={s.headerStats}>
            <HeaderStat label="Partner" value={data.partner.length} />
            <HeaderStat label="WP" value={data.work_packages.length} />
            <HeaderStat label="Deliverable" value={data.deliverable.length} />
            <HeaderStat label="Budget" value={
              project.budget_totale
                ? `€${Number(project.budget_totale).toLocaleString('it-IT')}`
                : '—'
            } />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...s.tab,
              ...(activeTab === tab.id ? s.tabActive : {}),
            }}
          >
            <span style={s.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main style={s.content}>
        {activeTab === 'overview' && <OverviewTab project={project} data={data} />}
        {activeTab === 'schedule' && <ScheduleTab data={data} project={project} />}
        {activeTab === 'deliverable' && <DeliverableTab data={data} />}
        {activeTab === 'partner' && <PartnerTab data={data} />}
        {activeTab === 'log' && <LogTab data={data} />}
        {activeTab === 'reporting' && <ReportingTab data={data} />}
      </main>
    </div>
  )
}

/* ══════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════ */

function HeaderStat({ label, value }) {
  return (
    <div style={s.headerStatItem}>
      <span style={s.headerStatValue}>{value}</span>
      <span style={s.headerStatLabel}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status?.toLowerCase()] || '#999'
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 12,
      background: `${color}15`,
      color: color,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    }}>
      {status || '—'}
    </span>
  )
}

function SectionTitle({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
        {children}
      </h3>
      {count !== undefined && (
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          background: 'var(--bg-accent)',
          padding: '2px 8px',
          borderRadius: 10,
          fontFamily: 'var(--font-mono)',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

function EmptyBlock({ message }) {
  return (
    <div style={{
      padding: '40px 0',
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: 14,
    }}>
      {message}
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

/* ── Overview Tab ── */
function OverviewTab({ project, data }) {
  const upcomingDeliverables = data.deliverable
    .filter(d => d.stato !== 'completed' && d.stato !== 'done')
    .slice(0, 5)
  const upcomingMilestones = data.milestones
    .filter(m => m.stato !== 'completed' && m.stato !== 'done')
    .slice(0, 5)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Timeline */}
      <Card>
        <SectionTitle>Timeline</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InfoRow label="Inizio" value={fmtDate(project.data_inizio)} />
          <InfoRow label="Fine" value={fmtDate(project.data_fine)} />
          <InfoRow label="Durata" value={project.durata_mesi ? `${project.durata_mesi} mesi` : '—'} />
          <InfoRow label="Stato" value={<StatusBadge status={project.stato} />} />
        </div>
      </Card>

      {/* Budget */}
      <Card>
        <SectionTitle>Budget</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InfoRow label="Budget totale" value={
            project.budget_totale ? `€${Number(project.budget_totale).toLocaleString('it-IT')}` : '—'
          } />
          <InfoRow label="Grant EU" value={
            project.grant_eu ? `€${Number(project.grant_eu).toLocaleString('it-IT')}` : '—'
          } />
          <InfoRow label="Cofinanziamento" value={
            project.cofinanziamento ? `€${Number(project.cofinanziamento).toLocaleString('it-IT')}` : '—'
          } />
          <InfoRow label="Tasso EU" value={
            project.budget_totale && project.grant_eu
              ? `${Math.round((project.grant_eu / project.budget_totale) * 100)}%`
              : '—'
          } />
        </div>
      </Card>

      {/* Upcoming deliverables */}
      <Card>
        <SectionTitle count={upcomingDeliverables.length}>Prossimi Deliverable</SectionTitle>
        {upcomingDeliverables.length === 0 ? (
          <EmptyBlock message="Nessun deliverable in scadenza" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingDeliverables.map(d => (
              <div key={d.id} style={s.listRow}>
                <span style={s.listCode}>{d.codice || '—'}</span>
                <span style={s.listName}>{d.titolo}</span>
                <span style={s.listDate}>{fmtDate(d.scadenza)}</span>
                <StatusBadge status={d.stato} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Milestones */}
      <Card>
        <SectionTitle count={upcomingMilestones.length}>Prossime Milestone</SectionTitle>
        {upcomingMilestones.length === 0 ? (
          <EmptyBlock message="Nessuna milestone in scadenza" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingMilestones.map(m => (
              <div key={m.id} style={s.listRow}>
                <span style={s.listCode}>{m.codice || '—'}</span>
                <span style={s.listName}>{m.titolo}</span>
                <span style={s.listDate}>{fmtDate(m.scadenza)}</span>
                <StatusBadge status={m.stato} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Work Packages summary */}
      <Card span={2}>
        <SectionTitle count={data.work_packages.length}>Work Packages</SectionTitle>
        {data.work_packages.length === 0 ? (
          <EmptyBlock message="Nessun WP inserito" />
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>WP</th>
                <th style={s.th}>Titolo</th>
                <th style={s.th}>Leader</th>
                <th style={s.th}>Inizio</th>
                <th style={s.th}>Fine</th>
              </tr>
            </thead>
            <tbody>
              {data.work_packages.map(wp => (
                <tr key={wp.id}>
                  <td style={s.td}>
                    <span style={s.wpBadge}>WP{wp.numero}</span>
                  </td>
                  <td style={s.td}>{wp.titolo}</td>
                  <td style={{ ...s.td, color: 'var(--text-secondary)' }}>{wp.leader || '—'}</td>
                  <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {wp.mese_inizio ? `M${wp.mese_inizio}` : '—'}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {wp.mese_fine ? `M${wp.mese_fine}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

/* ── Schedule Tab ── */
function ScheduleTab({ data, project }) {
  // Group tasks by WP
  const wpMap = useMemo(() => {
    const map = {}
    data.work_packages.forEach(wp => {
      map[wp.id] = { ...wp, tasks: [] }
    })
    data.tasks.forEach(task => {
      if (map[task.wp_id]) {
        map[task.wp_id].tasks.push(task)
      }
    })
    return Object.values(map)
  }, [data.work_packages, data.tasks])

  // Also show events
  const events = data.eventi

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tasks by WP */}
      {wpMap.map(wp => (
        <Card key={wp.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={s.wpBadge}>WP{wp.numero}</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
              {wp.titolo}
            </h3>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
            }}>
              M{wp.mese_inizio || '?'}–M{wp.mese_fine || '?'}
            </span>
          </div>
          {wp.tasks.length === 0 ? (
            <EmptyBlock message="Nessun task" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {wp.tasks.map(task => (
                <div key={task.id} style={s.taskRow}>
                  <span style={s.taskCode}>{task.codice || '—'}</span>
                  <span style={s.taskName}>{task.titolo}</span>
                  <span style={s.taskDates}>
                    {fmtDate(task.data_inizio)} → {fmtDate(task.data_fine)}
                  </span>
                  <StatusBadge status={task.stato} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Events */}
      <Card>
        <SectionTitle count={events.length}>Eventi</SectionTitle>
        {events.length === 0 ? (
          <EmptyBlock message="Nessun evento" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map(evt => (
              <div key={evt.id} style={s.listRow}>
                <span style={{
                  ...s.listCode,
                  background: 'var(--orange-light)',
                  color: 'var(--orange)',
                }}>
                  {evt.tipo || 'Evento'}
                </span>
                <span style={s.listName}>{evt.titolo}</span>
                <span style={s.listDate}>
                  {fmtDate(evt.data_inizio)}
                  {evt.luogo ? ` · ${evt.luogo}` : ''}
                </span>
                <StatusBadge status={evt.stato} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Deliverable Tab ── */
function DeliverableTab({ data }) {
  const grouped = useMemo(() => {
    const map = {}
    data.deliverable.forEach(d => {
      const wp = d.wp_id || 'no-wp'
      if (!map[wp]) map[wp] = []
      map[wp].push(d)
    })
    return map
  }, [data.deliverable])

  const wpLookup = useMemo(() => {
    const m = {}
    data.work_packages.forEach(wp => { m[wp.id] = wp })
    return m
  }, [data.work_packages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {data.deliverable.length === 0 ? (
        <Card><EmptyBlock message="Nessun deliverable inserito" /></Card>
      ) : (
        Object.entries(grouped).map(([wpId, dels]) => {
          const wp = wpLookup[wpId]
          return (
            <Card key={wpId}>
              <SectionTitle count={dels.length}>
                {wp ? `WP${wp.numero} — ${wp.titolo}` : 'Senza WP'}
              </SectionTitle>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Codice</th>
                    <th style={s.th}>Titolo</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Scadenza</th>
                    <th style={s.th}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {dels.map(d => (
                    <tr key={d.id}>
                      <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13 }}>
                        {d.codice || '—'}
                      </td>
                      <td style={s.td}>{d.titolo}</td>
                      <td style={{ ...s.td, color: 'var(--text-secondary)', fontSize: 13 }}>
                        {d.tipo || '—'}
                      </td>
                      <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {fmtDate(d.scadenza)}
                      </td>
                      <td style={s.td}><StatusBadge status={d.stato} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        })
      )}
    </div>
  )
}

/* ── Partner Tab ── */
function PartnerTab({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {data.partner.length === 0 ? (
        <Card><EmptyBlock message="Nessun partner inserito" /></Card>
      ) : (
        data.partner.map(p => (
          <Card key={p.id}>
            <div style={s.partnerHeader}>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                }}>
                  {p.nome}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                  {p.citta}{p.paese ? `, ${p.paese}` : ''} · {p.tipo || 'N/D'}
                </p>
              </div>
              <span style={{
                ...s.wpBadge,
                background: p.ruolo === 'coordinatore' ? 'var(--accent-light)' : 'var(--bg-accent)',
                color: p.ruolo === 'coordinatore' ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
                {p.ruolo || 'Partner'}
              </span>
            </div>

            {/* Contacts */}
            {p.persone && p.persone.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}>
                  Contatti
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {p.persone.map(per => (
                    <div key={per.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 500 }}>
                        {per.nome} {per.cognome}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{per.ruolo || ''}</span>
                      {per.email && (
                        <a href={`mailto:${per.email}`} style={{
                          color: 'var(--blue)',
                          textDecoration: 'none',
                          marginLeft: 'auto',
                          fontSize: 12,
                        }}>
                          {per.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget */}
            {p.budget && (
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                fontSize: 13,
              }}>
                Budget: <strong>€{Number(p.budget).toLocaleString('it-IT')}</strong>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  )
}

/* ── Log Tab ── */
function LogTab({ data }) {
  return (
    <Card>
      <SectionTitle count={data.log.length}>Activity Log</SectionTitle>
      {data.log.length === 0 ? (
        <EmptyBlock message="Nessuna attività registrata" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.log.map((entry, i) => (
            <div key={entry.id} style={{
              padding: '12px 0',
              borderBottom: i < data.log.length - 1 ? '1px solid var(--border-light)' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                minWidth: 90,
                paddingTop: 2,
              }}>
                {fmtDate(entry.created_at)}
              </span>
              <div>
                <span style={{ fontSize: 14 }}>{entry.testo || entry.azione || '—'}</span>
                {entry.tipo && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: 10,
                    marginLeft: 8,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: 'var(--bg-accent)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    {entry.tipo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── Reporting Tab ── */
function ReportingTab({ data }) {
  return (
    <Card>
      <SectionTitle count={data.reporting.length}>Reporting Periods</SectionTitle>
      {data.reporting.length === 0 ? (
        <EmptyBlock message="Nessun periodo di reporting" />
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Periodo</th>
              <th style={s.th}>Tipo</th>
              <th style={s.th}>Scadenza</th>
              <th style={s.th}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {data.reporting.map(r => (
              <tr key={r.id}>
                <td style={{ ...s.td, fontWeight: 500 }}>
                  {r.titolo || r.periodo || '—'}
                </td>
                <td style={{ ...s.td, color: 'var(--text-secondary)', fontSize: 13 }}>
                  {r.tipo || '—'}
                </td>
                <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {fmtDate(r.data_scadenza)}
                </td>
                <td style={s.td}><StatusBadge status={r.stato} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

/* ── Card wrapper ── */
function Card({ children, span }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-light)',
      ...(span ? { gridColumn: `span ${span}` } : {}),
    }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span style={{
        display: 'block',
        fontSize: 11,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 2,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>
        {value}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════ */
const s = {
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 24px 64px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  backBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  header: {
    marginBottom: 24,
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    padding: '4px 0',
    marginBottom: 12,
    display: 'block',
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
  },
  programLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  projectName: {
    fontFamily: 'var(--font-display)',
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    marginTop: 4,
  },
  projectTitle: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    marginTop: 4,
    maxWidth: 500,
  },
  headerStats: {
    display: 'flex',
    gap: 20,
    flexShrink: 0,
  },
  headerStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerStatValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text)',
    lineHeight: 1,
  },
  headerStatLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 2,
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    borderBottom: '2px solid var(--border-light)',
    marginBottom: 24,
    overflowX: 'auto',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
  tabIcon: {
    fontSize: 14,
  },
  content: {},

  /* Shared list/table styles */
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid var(--border-light)',
    fontSize: 13,
  },
  listCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'var(--bg-accent)',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  listName: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listDate: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    transition: 'background 0.1s',
  },
  taskCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-muted)',
    minWidth: 50,
  },
  taskName: {
    flex: 1,
  },
  taskDates: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '8px 12px',
    borderBottom: '2px solid var(--border-light)',
  },
  td: {
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid var(--border-light)',
    verticalAlign: 'middle',
  },
  wpBadge: {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'var(--blue-light)',
    color: 'var(--blue)',
    letterSpacing: '0.02em',
  },
  partnerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
}
