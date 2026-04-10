import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './ProjectView.css';

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [partners, setPartners] = useState([]);
  const [reporting, setReporting] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch progetto
      const { data: projectData, error: projError } = await supabase
        .from('progetti')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projError) throw projError;
      setProject(projectData);

      // Fetch work packages + tasks
      const { data: wpData, error: wpError } = await supabase
        .from('work_packages')
        .select('*, tasks(*)')
        .eq('id_progetto', projectId);

      if (wpError) throw wpError;
      setSchedule(wpData || []);

      // Fetch deliverables (legati ai task)
      const taskIds = wpData?.flatMap(wp => wp.tasks?.map(t => t.id) || []) || [];
      if (taskIds.length > 0) {
        const { data: delData, error: delError } = await supabase
          .from('deliverable')
          .select('*')
          .in('id_task', taskIds);

        if (!delError) setDeliverables(delData || []);
      }

      // Fetch partner
      const { data: partData, error: partError } = await supabase
        .from('partner')
        .select('*, persone(*)')
        .eq('id_progetto', projectId);

      if (partError) throw partError;
      setPartners(partData || []);

      // Fetch reporting
      const { data: repData, error: repError } = await supabase
        .from('reporting')
        .select('*')
        .eq('id_progetto', projectId);

      if (repError) throw repError;
      setReporting(repData || []);

      // Fetch log
      const { data: logData, error: logError } = await supabase
        .from('log')
        .select('*')
        .eq('id_progetto', projectId)
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      setLogs(logData || []);

    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="pv-loading">Caricamento...</div>;
  if (error) return <div className="pv-error">Errore: {error}</div>;
  if (!project) return <div className="pv-error">Progetto non trovato</div>;

  const getStatusColor = (status) => {
    const statusMap = {
      'on-track': '#10b981',
      'at-risk': '#f59e0b',
      'delayed': '#ef4444',
      'completed': '#6b7280',
      'finanziato': '#10b981',
      'in-progress': '#f59e0b',
      'not-started': '#94a3b8',
    };
    return statusMap[status] || '#9ca3af';
  };

  const getDataFine = (mesiDurata, dataInizio) => {
    const date = new Date(dataInizio);
    date.setMonth(date.getMonth() + mesiDurata);
    return date.toLocaleDateString('it-IT');
  };

  return (
    <div className="project-view">
      {/* Header */}
      <div className="pv-header">
        <button className="pv-back" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="pv-header-content">
          <h1 className="pv-title">{project.nome_completo}</h1>
          <p className="pv-subtitle">{project.acronimo} • {project.stato}</p>
          <div className="pv-meta">
            <span className="pv-meta-item">
              <strong>Inizio:</strong> {new Date(project.data_inizio).toLocaleDateString('it-IT')}
            </span>
            <span className="pv-meta-item">
              <strong>Durata:</strong> {project.mesi_durata} mesi
            </span>
            <span className="pv-meta-item">
              <strong>Fine:</strong> {getDataFine(project.mesi_durata, project.data_inizio)}
            </span>
            <span className="pv-meta-item">
              <strong>Budget:</strong> €{project.grant_totale?.toLocaleString('it-IT')}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="pv-tabs">
        <button
          className={`pv-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Schedule
        </button>
        <button
          className={`pv-tab ${activeTab === 'deliverable' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliverable')}
        >
          📦 Deliverable
        </button>
        <button
          className={`pv-tab ${activeTab === 'reporting' ? 'active' : ''}`}
          onClick={() => setActiveTab('reporting')}
        >
          📊 Reporting
        </button>
        <button
          className={`pv-tab ${activeTab === 'partner' ? 'active' : ''}`}
          onClick={() => setActiveTab('partner')}
        >
          👥 Partner
        </button>
        <button
          className={`pv-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          📝 Log
        </button>
      </div>

      {/* Tab Content */}
      <div className="pv-content">
        {/* SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="pv-section">
            <h2>Work Packages & Tasks</h2>
            {schedule.length === 0 ? (
              <p className="pv-empty">Nessun work package</p>
            ) : (
              schedule.map((wp) => (
                <div key={wp.id} className="pv-wp-card">
                  <div className="pv-wp-header">
                    <h3>{wp.numero} - {wp.nome}</h3>
                  </div>
                  <p className="pv-wp-desc">{wp.obiettivo}</p>
                  <div className="pv-wp-dates">
                    <span>Mese {wp.mese_inizio} → Mese {wp.mese_fine}</span>
                  </div>
                  {wp.tasks && wp.tasks.length > 0 && (
                    <div className="pv-tasks">
                      <h4>Task ({wp.tasks.length})</h4>
                      {wp.tasks.map((task) => (
                        <div key={task.id} className="pv-task-item">
                          <span>{task.codice} - {task.nome}</span>
                          <span className="pv-task-due">M{task.mese_inizio}-{task.mese_fine}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* DELIVERABLE */}
        {activeTab === 'deliverable' && (
          <div className="pv-section">
            <h2>Deliverable</h2>
            {deliverables.length === 0 ? (
              <p className="pv-empty">Nessun deliverable</p>
            ) : (
              <div className="pv-deliverables-grid">
                {deliverables.map((del) => (
                  <div key={del.id} className="pv-del-card">
                    <div className="pv-del-header">
                      <h4>{del.codice} - {del.nome}</h4>
                      <span className={`pv-del-status status-${del.stato}`}>
                        {del.stato === 'completed' ? '✓' : '○'}
                      </span>
                    </div>
                    <p className="pv-del-desc">{del.descrizione}</p>
                    <div className="pv-del-meta">
                      <span><strong>Tipo:</strong> {del.tipo}</span>
                      <span><strong>Livello:</strong> {del.livello}</span>
                      <span><strong>Scadenza:</strong> Mese {del.mese_scadenza}</span>
                    </div>
                    {del.compliance_ok && (
                      <div style={{ marginTop: '0.75rem', color: '#10b981', fontSize: '0.85rem' }}>
                        ✓ Compliance OK
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTING */}
        {activeTab === 'reporting' && (
          <div className="pv-section">
            <h2>Reporting</h2>
            {reporting.length === 0 ? (
              <p className="pv-empty">Nessun report</p>
            ) : (
              <div className="pv-reports-list">
                {reporting.map((rep) => (
                  <div key={rep.id} className="pv-report-item">
                    <div className="pv-report-header">
                      <h4>{rep.codice} - {rep.periodo}</h4>
                      <span className="pv-report-date">M{rep.mese_inizio}-{rep.mese_fine}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
                      <p><strong>Stato:</strong> {rep.stato}</p>
                      {rep.scadenza_interna && <p><strong>Scadenza interna:</strong> {rep.scadenza_interna}</p>}
                      {rep.scadenza_eacea && <p><strong>Scadenza EACEA:</strong> {rep.scadenza_eacea}</p>}
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                      <span style={{ color: rep.check_deliv_sygma ? '#10b981' : '#ef4444' }}>
                        {rep.check_deliv_sygma ? '✓' : '✗'} Deliverable
                      </span>
                      <span style={{ color: rep.check_partner_docs ? '#10b981' : '#ef4444' }}>
                        {rep.check_partner_docs ? '✓' : '✗'} Partner docs
                      </span>
                      <span style={{ color: rep.check_firme ? '#10b981' : '#ef4444' }}>
                        {rep.check_firme ? '✓' : '✗'} Firme
                      </span>
                      <span style={{ color: rep.check_financial ? '#10b981' : '#ef4444' }}>
                        {rep.check_financial ? '✓' : '✗'} Financial
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARTNER */}
        {activeTab === 'partner' && (
          <div className="pv-section">
            <h2>Partner</h2>
            {partners.length === 0 ? (
              <p className="pv-empty">Nessun partner</p>
            ) : (
              <div className="pv-partners-grid">
                {partners.map((partner) => (
                  <div key={partner.id} className="pv-partner-card">
                    <div className="pv-partner-header">
                      <h4>{partner.codice} - {partner.nome_completo}</h4>
                      <span className="pv-partner-role">{partner.ruolo}</span>
                    </div>
                    <p className="pv-partner-country">{partner.paese}</p>
                    {partner.budget_totale && (
                      <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        <p><strong>Budget:</strong> €{partner.budget_totale?.toLocaleString('it-IT')}</p>
                        <p><strong>Grant:</strong> €{partner.grant_amount?.toLocaleString('it-IT')}</p>
                      </div>
                    )}
                    {partner.persone && partner.persone.length > 0 && (
                      <div className="pv-partner-contacts">
                        <h5>Contatti</h5>
                        {partner.persone.map((person) => (
                          <div key={person.id} className="pv-contact">
                            <span>{person.nome} ({person.ruolo_org})</span>
                            <span className="pv-contact-email">{person.email}</span>
                            {person.telefono && <span style={{ fontSize: '0.8rem', color: '#7a7268' }}>{person.telefono}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOG */}
        {activeTab === 'log' && (
          <div className="pv-section">
            <h2>Activity Log</h2>
            {logs.length === 0 ? (
              <p className="pv-empty">Nessun log</p>
            ) : (
              <div className="pv-log-timeline">
                {logs.map((log) => (
                  <div key={log.id} className="pv-log-entry">
                    <div className="pv-log-dot"></div>
                    <div className="pv-log-content">
                      <p className="pv-log-action">{log.tipo_oggetto} - {log.tipo_problema}</p>
                      <p className="pv-log-note">{log.descrizione}</p>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        <span style={{ marginRight: '1rem' }}>
                          <strong>Priorità:</strong> {log.priorita}
                        </span>
                        <span style={{ marginRight: '1rem' }}>
                          <strong>Stato:</strong> {log.risolto ? 'Risolto' : 'Aperto'}
                        </span>
                        {log.destinazione && <span><strong>A:</strong> {log.destinazione}</span>}
                      </div>
                      <span className="pv-log-date">
                        {new Date(log.created_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectView;