import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('progetti')
        .select('id, acronimo, nome_completo, id_programma, stato, data_inizio, mesi_durata')
        .order('data_inizio', { ascending: false })

      if (err) throw err
      setProjects(data || [])
    } catch (err) {
      console.error('Errore nel fetch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const getStatusColor = (status) => {
    const colors = {
      'finanziato': '#10b981',
      'in-progress': '#f59e0b',
      'non-finanziato': '#ef4444',
      'completato': '#6b7280'
    }
    return colors[status] || '#c9a84c'
  }

  const getDataFine = (dataInizio, mesiDurata) => {
    const date = new Date(dataInizio)
    date.setMonth(date.getMonth() + mesiDurata)
    return date.toLocaleDateString('it-IT')
  }

  return (
    <div style={{
      background: '#0f0e0c', minHeight: '100vh', color: '#ddd8ce',
      fontFamily: 'Georgia, serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#141210', borderBottom: '1px solid #2e2820',
        padding: '16px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.05em' }}>
          EU PROJECT MANAGER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#5a5248', fontFamily: 'sans-serif' }}>
            {session.user.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent', border: '1px solid #2e2820',
              color: '#7a7268', padding: '5px 12px', borderRadius: 3,
              fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif'
            }}
          >
            Esci
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ padding: '40px 28px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, color: '#c9a84c', marginBottom: 32 }}>I tuoi Progetti</h1>

        {loading && (
          <div style={{ color: '#7a7268', fontFamily: 'sans-serif' }}>
            Caricamento progetti...
          </div>
        )}

        {error && (
          <div style={{
            background: '#2e2820', border: '1px solid #c9a84c',
            color: '#c9a84c', padding: 16, borderRadius: 4, fontFamily: 'sans-serif'
          }}>
            Errore: {error}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div style={{
            background: '#141210', border: '1px solid #2e2820',
            borderRadius: 4, padding: 32, textAlign: 'center'
          }}>
            <div style={{ fontSize: 14, color: '#7a7268', fontFamily: 'sans-serif' }}>
              Nessun progetto trovato.
            </div>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 24
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                style={{
                  background: '#141210', border: '1px solid #2e2820',
                  borderRadius: 4, padding: 20, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 0 transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a84c'
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(201, 168, 76, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2e2820'
                  e.currentTarget.style.boxShadow = '0 0 0 transparent'
                }}
              >
                {/* Acronimo */}
                <div style={{
                  fontSize: 11, color: '#7a7268', fontFamily: 'sans-serif',
                  marginBottom: 8, textTransform: 'uppercase', fontWeight: 700
                }}>
                  {project.acronimo}
                </div>

                {/* Nome completo */}
                <h3 style={{
                  fontSize: 16, fontWeight: 700, color: '#c9a84c',
                  margin: '0 0 12px 0'
                }}>
                  {project.nome_completo}
                </h3>

                {/* Status */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    display: 'inline-block',
                    background: getStatusColor(project.stato),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                    textTransform: 'capitalize'
                  }}>
                    {project.stato}
                  </span>
                </div>

                {/* Date */}
                <div style={{
                  fontSize: 11, color: '#5a5248', fontFamily: 'sans-serif',
                  lineHeight: 1.8, marginTop: 16, paddingTop: 16,
                  borderTop: '1px solid #2e2820'
                }}>
                  <div>
                    <strong style={{ color: '#7a7268' }}>Inizio:</strong> {new Date(project.data_inizio).toLocaleDateString('it-IT')}
                  </div>
                  <div>
                    <strong style={{ color: '#7a7268' }}>Durata:</strong> {project.mesi_durata} mesi
                  </div>
                  <div>
                    <strong style={{ color: '#7a7268' }}>Fine:</strong> {getDataFine(project.data_inizio, project.mesi_durata)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}