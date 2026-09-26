import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, ClipboardList, ShieldCheck, FlaskConical, Plus, Search, Check, BookOpen, LayoutList, CircleHelp, PanelLeftClose } from 'lucide-react';
import type { Actor, CaseRecord, CaseSummary, Health, Source } from '../shared/domain';
import { api } from './api';
import { Modal, Spinner, Status, money } from './components';
import { SourceEditor } from './SourceEditor';
import { Workspace } from './Workspace';

export function App() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [item, setItem] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState<'guide' | 'policy' | 'new' | null>(null);
  const [template, setTemplate] = useState<Source | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  async function refreshQueue() { setCases(await api<CaseSummary[]>('/cases')); }
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let session: { actor: Actor };
        try { session = await api('/session'); }
        catch { session = await api('/session', { method: 'POST', body: { role: 'reviewer' } }); }
        const [status, queue, first] = await Promise.all([api<Health>('/health'), api<CaseSummary[]>('/cases'), api<CaseRecord>('/cases/CR-1001')]);
        if (live) { setActor(session.actor); setHealth(status); setCases(queue); setTemplate(first.source); }
      } catch (err) { if (live) setError(err instanceof Error ? err.message : 'Could not connect to the review service.'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [refresh]);
  useEffect(() => {
    if (!selectedId) { setItem(null); return; }
    let live = true; setItem(null); setError('');
    api<CaseRecord>(`/cases/${selectedId}`).then(record => { if (live) setItem(record); }).catch(err => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [selectedId]);
  async function reloadCase() {
    if (selectedId) setItem(await api<CaseRecord>(`/cases/${selectedId}`));
    await refreshQueue();
  }
  async function switchRole() {
    setRoleBusy(true); setError('');
    try { const session = await api<{ actor: Actor }>('/session', { method: 'POST', body: { role: actor?.role === 'reviewer' ? 'supervisor' : 'reviewer' } }); setActor(session.actor); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not switch persona.'); }
    finally { setRoleBusy(false); }
  }
  function back() { setSelectedId(null); setError(''); }
  const filtered = cases.filter(c => (!search || `${c.customer} ${c.business} ${c.id}`.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || (filter === 'pending' ? ['unreviewed', 'analysed', 'awaiting_approval'].includes(c.status) : ['escalated', 'information_requested', 'closed'].includes(c.status))));
  const pending = cases.filter(c => ['unreviewed', 'analysed', 'awaiting_approval'].includes(c.status)).length;
  const completed = cases.length - pending;
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="brand" onClick={back}><span className="brand-mark"><ClipboardList size={23} /></span><span>Collections<span>Review Desk</span></span></button>
      <div className="sidebar-label">WORKSPACE</div>
      <nav><button className="nav-item active" onClick={() => { back(); setSidebarOpen(false); }}><LayoutList size={18} />Review queue<span className="nav-count">{cases.length}</span></button>
        <button className="nav-item" onClick={() => setModal('policy')}><BookOpen size={18} />Demo policy<ArrowUpRight size={14} /></button>
        <button className="nav-item" onClick={() => setModal('guide')}><CircleHelp size={18} />Demo guide<ArrowUpRight size={14} /></button>
      </nav>
      <div className="sidebar-bottom"><div className="sandbox-card"><FlaskConical size={18} /><strong>Synthetic workspace</strong><p>Made-up cases. Real analysis.<br />Bank actions are simulated.</p></div>
        <div className="persona"><div className="avatar">{actor?.role === 'supervisor' ? 'VS' : 'AR'}</div><div><strong>{actor?.name || 'Connecting…'}</strong><span>{actor?.role === 'supervisor' ? 'Supervisor' : 'Quality reviewer'}</span></div></div>
        <button className="switch-role" onClick={switchRole} disabled={roleBusy || !actor}>{roleBusy ? 'Switching…' : `Switch to ${actor?.role === 'reviewer' ? 'supervisor' : 'reviewer'}`}<ArrowRight size={14} /></button><span className="demo-persona-note">Demo personas · no enterprise SSO</span>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><PanelLeftClose size={19} /></button><span className="topbar-product">Collections operations</span><span className="topbar-divider">/</span><span>Quality assurance</span></div>
        <span className={`connection ${health?.configured ? '' : 'offline'}`}><i />{health?.configured ? 'Gemini connected' : 'Model not configured'}</span>
      </header>
      <main>
        {error && <div className="error-box" role="alert">{error}<button className="text-button" onClick={() => { setError(''); setLoading(true); setRefresh(n => n + 1); }}>Reconnect</button></div>}
        {loading ? <div className="page-loading"><Spinner label="Opening the review desk" /></div> : selectedId ? item && actor ? <Workspace key={item.id} item={item} actor={actor} health={health} onBack={back} onRefresh={reloadCase} onSwitchRole={switchRole} /> : !error && <div className="page-loading"><Spinner label="Loading case" /></div> : <>
          <div className="page-heading"><div><div className="eyebrow">EVIDENCE BEFORE ACTION</div><h1>Collections reviews<span className="heading-dot">.</span></h1><p>Check the conversation. Resolve the discrepancy. Record the decision.</p></div><button className="button primary" onClick={() => setModal('new')} disabled={!template}><Plus size={17} />New synthetic case</button></div>
          <div className="overview-grid"><div className="overview-card"><span>In the review queue</span><strong>{pending.toString().padStart(2, '0')}</strong><div><span className="small-dot amber" />Awaiting review or approval</div></div><div className="overview-card"><span>Decisions recorded</span><strong>{completed.toString().padStart(2, '0')}</strong><div><Check size={14} />Saved to the local case system</div></div><div className="overview-card overview-note"><ShieldCheck size={27} /><div><strong>Every action has an owner.</strong><p>AI proposes findings. A supervisor approves the next step, with evidence attached.</p></div></div></div>
          <section className="queue-panel"><div className="queue-toolbar"><div className="tabs" aria-label="Filter review queue"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All cases <span>{cases.length}</span></button><button className={filter === 'pending' ? 'selected' : ''} onClick={() => setFilter('pending')}>Pending</button><button className={filter === 'completed' ? 'selected' : ''} onClick={() => setFilter('completed')}>Decided</button></div><label className="search"><Search size={16} /><input aria-label="Search cases" placeholder="Search name or case ID" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
            <div className="table-scroll"><table className="case-table"><thead><tr><th>Customer / case</th><th>Overdue amount</th><th>Conversation</th><th>Status</th><th>Owner</th><th><span className="sr-only">Open case</span></th></tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td><button className="case-name" onClick={() => setSelectedId(c.id)}>{c.customer}</button><span className="case-subtitle">{c.business} <span>·</span> {c.id}</span></td><td><strong>{money(c.overdueAmount)}</strong><span className="case-subtitle">{c.daysPastDue} days past due</span></td><td><span className="language">{c.language}</span><span className="case-subtitle">Supplied transcript</span></td><td><Status status={c.status} />{c.findingCount !== null && <span className="case-subtitle">{c.findingCount} finding{c.findingCount === 1 ? '' : 's'} in latest review</span>}</td><td><span className="owner-cell"><span className="tiny-avatar">AR</span>{c.owner.split(' ')[0]}</span></td><td><button className="open-case" aria-label={`Open ${c.customer}'s case`} onClick={() => setSelectedId(c.id)}><ArrowUpRight size={19} /></button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-search">No cases match this search.</div>}</div>
            <div className="queue-footer"><span><FlaskConical size={14} />All {cases.length} cases use synthetic data</span><span>Policy: DEMO-COL-1.0</span></div>
          </section>
          <div className="queue-explainer"><div><span className="step-number">01</span><div><h3>Review the evidence</h3><p>Conversation, case note and supplied bank policy.</p></div></div><div><span className="step-number">02</span><div><h3>Inspect the findings</h3><p>Exact quotations, policy references and uncertainty.</p></div></div><div><span className="step-number">03</span><div><h3>Complete the handoff</h3><p>Supervisor decision, saved follow-up and audit trail.</p></div></div></div>
        </>}
      </main>
      <footer className="app-footer"><span>Collections Review Desk</span><span>Synthetic demonstration · No connection to a bank</span></footer>
    </div>
    {modal === 'new' && template && <SourceEditor template={template} onClose={() => setModal(null)} onSave={async (_source, details) => { const created = await api<CaseRecord>('/cases', { method: 'POST', body: details }); await refreshQueue(); setSelectedId(created.id); }} />}
    {modal === 'policy' && template && <Modal title="Demonstration bank policy" onClose={() => setModal(null)}><div className="modal-content"><div className="notice">This is an authored demonstration policy, not an RBI compliance certification. Each case keeps its own version.</div><span className="mono-label">{template.policy.version}</span>{template.policy.clauses.map(p => <div className="policy-clause" key={p.id}><h3><span>{p.id}</span>{p.title}</h3><p>{p.text}</p></div>)}</div></Modal>}
    {modal === 'guide' && <Modal title="A complete review in seven minutes" onClose={() => setModal(null)}><div className="modal-content guide"><p>Start with Ravi Mehta’s case. The case note and conversation disagree. Let the model find the evidence before proposing an action.</p><ol><li><strong>Run the review.</strong> Gemini reads the supplied transcript, note, policy and directory.</li><li><strong>Inspect the quotes.</strong> Click a source reference to find the original statement.</li><li><strong>Change the evidence.</strong> Edit a relevant statement and rerun to get a new report version.</li><li><strong>Propose a next step.</strong> Add a specific reason and send it to the supervisor.</li><li><strong>Switch demo persona.</strong> Approve the proposal as supervisor and inspect the saved follow-up.</li><li><strong>Check the other cases.</strong> Nisha’s call is compliant; Farah’s has unresolved context.</li></ol><div className="notice">Working: live analysis, citation checks, versioned reviews, approval permissions, persistence and export. Simulated: personas and bank follow-up queues. Audio transcription and live calling are not part of this build.</div><a className="button secondary" href="/pitch.html" target="_blank" rel="noreferrer">Open one-slide pitch<ArrowUpRight size={15} /></a></div></Modal>}
  </div>;
}
