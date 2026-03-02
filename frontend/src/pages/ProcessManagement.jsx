/**
 * Page: ProcessManagement — IT süreç yönetimi.
 * İki görünüm: süreç listesi (cards) ve süreç detayı (todo-list adımlar).
 */
import { useEffect, useState } from 'react';
import {
    GitBranch, Plus, X, Save, Trash2, Edit, ArrowLeft,
    CheckCircle, Circle, GripVertical, ChevronRight, Search, AlertTriangle,
} from 'lucide-react';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';
import {
    getProcesses, getProcess, createProcess, updateProcess, deleteProcess,
    createProcessStep, updateProcessStep, deleteProcessStep,
} from '../services/api';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444', '#84cc16'];

export default function ProcessManagement() {
    // ── State ────────────────────────────
    const [processes, setProcesses] = useState([]);
    const [activeProcess, setActiveProcess] = useState(null); // full process with steps
    const [loading, setLoading] = useState(true);

    // Create / edit process
    const [showCreate, setShowCreate] = useState(false);
    const [editingProcess, setEditingProcess] = useState(null);
    const [processForm, setProcessForm] = useState({ name: '', description: '', color: COLORS[0] });
    const [saving, setSaving] = useState(false);

    // Add / edit step
    const [showStepForm, setShowStepForm] = useState(false);
    const [editingStep, setEditingStep] = useState(null);
    const [stepForm, setStepForm] = useState({ title: '', description: '' });
    const [savingStep, setSavingStep] = useState(false);

    // Search
    const [search, setSearch] = useState('');

    // Modal
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    // ── Fetch ────────────────────────────
    const fetchProcesses = async () => {
        try {
            const { data } = await getProcesses();
            setProcesses(data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const fetchProcess = async (id) => {
        try {
            const { data } = await getProcess(id);
            setActiveProcess(data);
        } catch { setActiveProcess(null); }
    };

    useEffect(() => { fetchProcesses(); }, []);

    // ── Process CRUD ────────────────────
    const handleCreateProcess = async () => {
        if (!processForm.name.trim()) return;
        setSaving(true);
        try {
            const { data } = await createProcess(processForm);
            setShowCreate(false);
            setProcessForm({ name: '', description: '', color: COLORS[(processes.length + 1) % COLORS.length] });
            fetchProcesses();
        } catch (err) {
            setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Süreç oluşturulamadı.', type: 'error', onConfirm: closeModal });
        } finally { setSaving(false); }
    };

    const handleUpdateProcess = async () => {
        if (!processForm.name.trim() || !editingProcess) return;
        setSaving(true);
        try {
            await updateProcess(editingProcess.id, processForm);
            setEditingProcess(null);
            setProcessForm({ name: '', description: '', color: COLORS[0] });
            fetchProcesses();
            if (activeProcess?.id === editingProcess.id) fetchProcess(editingProcess.id);
        } catch (err) {
            setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Güncelleme başarısız.', type: 'error', onConfirm: closeModal });
        } finally { setSaving(false); }
    };

    const handleDeleteProcess = (p) => {
        setModal({
            open: true, title: 'Süreci Sil',
            message: `"${p.name}" sürecini ve tüm adımlarını silmek istediğinize emin misiniz?`,
            type: 'confirm',
            onConfirm: async () => {
                closeModal();
                try {
                    await deleteProcess(p.id);
                    if (activeProcess?.id === p.id) setActiveProcess(null);
                    fetchProcesses();
                } catch { /* ignore */ }
            },
        });
    };

    const openEditProcess = (p) => {
        setEditingProcess(p);
        setProcessForm({ name: p.name, description: p.description || '', color: p.color || COLORS[0] });
        setShowCreate(true);
    };

    const cancelProcessForm = () => {
        setShowCreate(false);
        setEditingProcess(null);
        setProcessForm({ name: '', description: '', color: COLORS[(processes.length) % COLORS.length] });
    };

    // ── Step CRUD ────────────────────────
    const handleCreateStep = async () => {
        if (!stepForm.title.trim() || !activeProcess) return;
        setSavingStep(true);
        try {
            await createProcessStep(activeProcess.id, stepForm);
            setShowStepForm(false);
            setStepForm({ title: '', description: '' });
            fetchProcess(activeProcess.id);
            fetchProcesses();
        } catch (err) {
            setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Adım eklenemedi.', type: 'error', onConfirm: closeModal });
        } finally { setSavingStep(false); }
    };

    const handleUpdateStep = async () => {
        if (!stepForm.title.trim() || !editingStep) return;
        setSavingStep(true);
        try {
            await updateProcessStep(editingStep.id, stepForm);
            setShowStepForm(false);
            setEditingStep(null);
            setStepForm({ title: '', description: '' });
            fetchProcess(activeProcess.id);
            fetchProcesses();
        } catch (err) {
            setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Güncelleme başarısız.', type: 'error', onConfirm: closeModal });
        } finally { setSavingStep(false); }
    };

    const handleToggleStep = async (step) => {
        try {
            await updateProcessStep(step.id, { is_completed: !step.is_completed });
            fetchProcess(activeProcess.id);
            fetchProcesses();
        } catch { /* ignore */ }
    };

    const handleDeleteStep = (step) => {
        setModal({
            open: true, title: 'Adımı Sil',
            message: `"${step.title}" adımını silmek istediğinize emin misiniz?`,
            type: 'confirm',
            onConfirm: async () => {
                closeModal();
                try {
                    await deleteProcessStep(step.id);
                    fetchProcess(activeProcess.id);
                    fetchProcesses();
                } catch { /* ignore */ }
            },
        });
    };

    const openEditStep = (step) => {
        setEditingStep(step);
        setStepForm({ title: step.title, description: step.description || '' });
        setShowStepForm(true);
    };

    const cancelStepForm = () => {
        setShowStepForm(false);
        setEditingStep(null);
        setStepForm({ title: '', description: '' });
    };

    // ── Filtered ────────────────────────
    const filtered = processes.filter((p) => {
        if (!search) return true;
        return p.name.toLowerCase().includes(search.toLowerCase());
    });

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>;

    // ═══════════════════════════════════════
    // DETAIL VIEW — active process steps
    // ═══════════════════════════════════════
    if (activeProcess) {
        const steps = activeProcess.steps || [];
        const completedCount = steps.filter((s) => s.is_completed).length;
        const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

        return (
            <div>
                <AppModal open={modal.open} title={modal.title} message={modal.message} type={modal.type} onConfirm={modal.onConfirm} onCancel={closeModal} />

                {/* Header */}
                <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <button onClick={() => setActiveProcess(null)} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 10, padding: '7px 9px', cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                title="Geri Dön"><ArrowLeft style={{ width: 16, height: 16 }} /></button>
                            <h2 className="page-title">
                                <span className="page-title-icon" style={{ background: `${activeProcess.color || '#6366f1'}20` }}>
                                    <GitBranch style={{ width: 18, height: 18, color: activeProcess.color || '#6366f1' }} />
                                </span>
                                {activeProcess.name}
                            </h2>
                        </div>
                        {activeProcess.description && <p className="page-subtitle">{activeProcess.description}</p>}
                    </div>
                    <Button icon={showStepForm ? X : Plus} onClick={showStepForm ? cancelStepForm : () => setShowStepForm(true)}>
                        {showStepForm ? 'İptal' : 'Yeni Adım'}
                    </Button>
                </div>

                {/* Progress bar */}
                <div className="glass-card" style={{ padding: '16px 24px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>İlerleme</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: activeProcess.color || '#6366f1' }}>{completedCount}/{steps.length} adım · %{progress}</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(99,102,241,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${activeProcess.color || '#6366f1'}, ${activeProcess.color || '#6366f1'}aa)`, transition: 'width 0.4s ease' }} />
                    </div>
                </div>

                {/* Add/Edit Step Form */}
                {showStepForm && (
                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: editingStep ? '#f59e0b' : '#10b981', boxShadow: editingStep ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(16,185,129,0.4)' }} />
                            {editingStep ? `Adım Düzenle — #${editingStep.id}` : 'Yeni Adım Ekle'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Adım Başlığı</label>
                                <input value={stepForm.title} onChange={(e) => setStepForm((f) => ({ ...f, title: e.target.value }))} placeholder="ör: Windows kurulumu yap" className="input" />
                            </div>
                            <div>
                                <label className="form-label">Açıklama (Opsiyonel)</label>
                                <textarea value={stepForm.description} onChange={(e) => setStepForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detaylı açıklama..." className="input" rows={2} style={{ resize: 'vertical', minHeight: 48, fontFamily: 'Inter, sans-serif' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                            <Button variant="ghost" onClick={cancelStepForm}>İptal</Button>
                            <Button icon={editingStep ? Save : Plus} onClick={editingStep ? handleUpdateStep : handleCreateStep} loading={savingStep} disabled={!stepForm.title.trim()}>
                                {editingStep ? 'Güncelle' : 'Ekle'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Steps List */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    {steps.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle />
                            <p>Henüz adım eklenmemiş. Yukarıdaki "Yeni Adım" butonuyla başlayın.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {steps.map((step, idx) => (
                                <div
                                    key={step.id}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 16,
                                        padding: '18px 24px',
                                        borderBottom: idx < steps.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none',
                                        background: step.is_completed ? 'rgba(16,185,129,0.03)' : 'transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {/* Step number */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2, flexShrink: 0 }}>
                                        <span style={{
                                            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 700,
                                            background: step.is_completed ? 'rgba(16,185,129,0.15)' : `${activeProcess.color || '#6366f1'}15`,
                                            color: step.is_completed ? '#10b981' : (activeProcess.color || '#6366f1'),
                                            border: `1px solid ${step.is_completed ? 'rgba(16,185,129,0.2)' : `${activeProcess.color || '#6366f1'}25`}`,
                                        }}>{idx + 1}</span>
                                    </div>

                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggleStep(step)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, marginTop: 1 }}
                                        title={step.is_completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                                    >
                                        {step.is_completed
                                            ? <CheckCircle style={{ width: 22, height: 22, color: '#10b981' }} />
                                            : <Circle style={{ width: 22, height: 22, color: '#334155' }} />
                                        }
                                    </button>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: 14, fontWeight: 600, marginBottom: step.description ? 4 : 0,
                                            color: step.is_completed ? '#64748b' : '#e2e8f0',
                                            textDecoration: step.is_completed ? 'line-through' : 'none',
                                            transition: 'all 0.2s',
                                        }}>{step.title}</p>
                                        {step.description && (
                                            <p style={{
                                                fontSize: 12, color: step.is_completed ? '#475569' : '#94a3b8',
                                                lineHeight: 1.5, textDecoration: step.is_completed ? 'line-through' : 'none',
                                            }}>{step.description}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                        <button onClick={() => openEditStep(step)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Edit style={{ width: 14, height: 14 }} /></button>
                                        <button onClick={() => handleDeleteStep(step)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#f87171' }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    // LIST VIEW — all processes
    // ═══════════════════════════════════════
    return (
        <div>
            <AppModal open={modal.open} title={modal.title} message={modal.message} type={modal.type} onConfirm={modal.onConfirm} onCancel={closeModal} />

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2 className="page-title">
                        <span className="page-title-icon"><GitBranch style={{ width: 18, height: 18 }} /></span>
                        Süreç Yönetimi
                    </h2>
                    <p className="page-subtitle">IT iş süreçlerinizi adım adım tanımlayın ve takip edin</p>
                </div>
                <Button icon={showCreate ? X : Plus} onClick={showCreate ? cancelProcessForm : () => { setShowCreate(true); setEditingProcess(null); setProcessForm({ name: '', description: '', color: COLORS[processes.length % COLORS.length] }); }}>
                    {showCreate ? 'İptal' : 'Yeni Süreç'}
                </Button>
            </div>

            {/* Create / Edit Process Form */}
            {showCreate && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: editingProcess ? '#f59e0b' : '#10b981', boxShadow: editingProcess ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(16,185,129,0.4)' }} />
                        {editingProcess ? `Süreç Düzenle — ${editingProcess.name}` : 'Yeni Süreç Oluştur'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                        <div>
                            <label className="form-label">Süreç Adı</label>
                            <input value={processForm.name} onChange={(e) => setProcessForm((f) => ({ ...f, name: e.target.value }))} placeholder="ör: Yeni Bilgisayar Kurulumu" className="input" />
                        </div>
                        <div>
                            <label className="form-label">Açıklama (Opsiyonel)</label>
                            <input value={processForm.description} onChange={(e) => setProcessForm((f) => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" className="input" />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">Renk</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {COLORS.map((c) => (
                                <button
                                    key={c} type="button" onClick={() => setProcessForm((f) => ({ ...f, color: c }))}
                                    style={{
                                        width: 28, height: 28, borderRadius: 8, border: processForm.color === c ? '2px solid #fff' : '2px solid transparent',
                                        background: c, cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: processForm.color === c ? `0 0 12px ${c}60` : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={cancelProcessForm}>İptal</Button>
                        <Button icon={editingProcess ? Save : Plus} onClick={editingProcess ? handleUpdateProcess : handleCreateProcess} loading={saving} disabled={!processForm.name.trim()}>
                            {editingProcess ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Search */}
            {processes.length > 0 && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Süreç adı ile ara..." className="input" style={{ paddingLeft: 44 }} />
                    </div>
                </div>
            )}

            {/* Process Cards */}
            {filtered.length === 0 && !showCreate ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <GitBranch />
                        <p>{search ? 'Aramayla eşleşen süreç bulunamadı.' : 'Henüz süreç oluşturulmamış. Yukarıdaki "Yeni Süreç" butonuyla başlayın.'}</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {filtered.map((p) => {
                        const progress = p.step_count > 0 ? Math.round((p.completed_count / p.step_count) * 100) : 0;
                        return (
                            <div
                                key={p.id}
                                className="glass-card"
                                onClick={() => fetchProcess(p.id)}
                                style={{ cursor: 'pointer', padding: 24, position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${p.color || '#6366f1'}30`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                            >
                                {/* Top orb */}
                                <div style={{
                                    position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                                    background: `radial-gradient(circle, ${p.color || '#6366f1'}15, transparent 70%)`,
                                }} />

                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12,
                                            background: `${p.color || '#6366f1'}18`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <GitBranch style={{ width: 20, height: 20, color: p.color || '#6366f1' }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{p.name}</h3>
                                            {p.description && <p style={{ fontSize: 12, color: '#64748b' }}>{p.description}</p>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => openEditProcess(p)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Edit style={{ width: 14, height: 14 }} /></button>
                                        <button onClick={() => handleDeleteProcess(p)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#f87171' }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>{p.completed_count}/{p.step_count} adım tamamlandı</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: p.color || '#6366f1' }}>%{progress}</span>
                                    </div>
                                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(99,102,241,0.08)' }}>
                                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: p.color || '#6366f1', transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, color: '#475569' }}>
                                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString('tr-TR') : ''}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: p.color || '#6366f1', fontSize: 12, fontWeight: 600 }}>
                                        Adımları Gör <ChevronRight style={{ width: 14, height: 14 }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
