/**
 * Page: Assignments — zimmet listesi, yeni zimmet, detay+geçmiş, transfer, arama.
 */
import { useEffect, useState } from 'react';
import {
    ClipboardList, Monitor, User, Calendar, UserCheck,
    Trash2, Plus, ChevronDown, ChevronUp, ArrowRightLeft, X,
    Cpu, HardDrive, Search, History, Printer,
} from 'lucide-react';
import useStore from '../store/useStore';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import AssignmentModal from '../components/organisms/AssignmentModal';
import SearchableSelect from '../components/molecules/SearchableSelect';
import {
    deleteAssignment, createAssignment,
    getEmployees, getComputer, getAssignmentHistory,
} from '../services/api';

export default function Assignments() {
    const { assignments, fetchAssignments } = useStore();
    const [assignOpen, setAssignOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [transferId, setTransferId] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [newEmployeeId, setNewEmployeeId] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => { fetchAssignments(); }, []);

    // Filter by person name
    const filtered = assignments.filter((a) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (a.employee_name || '').toLowerCase().includes(q) ||
            (a.computer_brand || '').toLowerCase().includes(q) ||
            (a.computer_model || '').toLowerCase().includes(q) ||
            (a.computer_serial || '').toLowerCase().includes(q)
        );
    });

    const handleDelete = async (id) => {
        if (!confirm('Bu zimmeti silmek istediğinize emin misiniz? Bilgisayar stoka döner.')) return;
        try {
            await deleteAssignment(id);
            fetchAssignments();
            if (expandedId === id) { setExpandedId(null); setDetailData(null); setHistoryData([]); }
        } catch (err) { console.error(err); }
    };

    const toggleExpand = async (a) => {
        if (expandedId === a.id) {
            setExpandedId(null);
            setDetailData(null);
            setHistoryData([]);
            return;
        }
        setExpandedId(a.id);
        try {
            const [compRes, histRes] = await Promise.all([
                getComputer(a.computer_id),
                getAssignmentHistory(a.computer_id),
            ]);
            setDetailData(compRes.data);
            setHistoryData(histRes.data);
        } catch {
            setDetailData(null);
            setHistoryData([]);
        }
    };

    const openTransfer = async (a) => {
        setTransferId(a.id);
        setNewEmployeeId('');
        try {
            const { data } = await getEmployees();
            setEmployees(data);
        } catch { setEmployees([]); }
    };

    const handleTransfer = async () => {
        if (!newEmployeeId) return;
        const assignment = assignments.find((a) => a.id === transferId);
        if (!assignment) return;
        setTransferring(true);
        try {
            await deleteAssignment(transferId);
            await createAssignment({
                computer_id: assignment.computer_id,
                employee_id: Number(newEmployeeId),
            });
            setTransferId(null);
            setExpandedId(null);
            setDetailData(null);
            setHistoryData([]);
            fetchAssignments();
        } catch (err) { console.error(err); }
        finally { setTransferring(false); }
    };

    // ── Print handlers ────────────────
    const toggleSelectMode = () => {
        if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
        else { setSelectMode(true); }
    };
    const handleToggleSelect = (id) => {
        setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };
    const handleToggleAll = () => {
        const allSelected = filtered.every((a) => selectedIds.has(a.id));
        setSelectedIds(allSelected ? new Set() : new Set(filtered.map((a) => a.id)));
    };
    const handlePrint = () => {
        const selected = filtered.filter((a) => selectedIds.has(a.id));
        if (selected.length === 0) return;
        const rows = selected.map((a) => `<tr><td>${a.employee_name || '—'}</td><td>${a.computer_brand} ${a.computer_model}</td><td style="font-family:monospace">${a.computer_serial || '—'}</td><td>${a.assigned_date || '—'}</td></tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Zimmet Listesi</title>
        <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:30px;color:#1e293b}h1{font-size:20px;margin-bottom:4px}.subtitle{font-size:12px;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569}td{padding:7px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.footer{margin-top:24px;font-size:11px;color:#94a3b8}@media print{body{margin:15px}}</style></head><body>
        <h1>Zimmet Listesi</h1>
        <p class="subtitle">Toplam ${selected.length} zimmet · Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
        <table><thead><tr><th>Personel</th><th>Bilgisayar</th><th>Seri No</th><th>Zimmet Tarihi</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">IT Envanter Takip Sistemi</div></body></html>`;
        const w = window.open('', '_blank', 'width=900,height=600');
        w.document.write(html); w.document.close(); w.focus();
        setTimeout(() => w.print(), 300);
    };

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2 className="page-title">
                        <span className="page-title-icon"><ClipboardList style={{ width: 18, height: 18 }} /></span>
                        Zimmetler
                    </h2>
                    <p className="page-subtitle">Bilgisayar — personel eşleştirmeleri</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button icon={Printer} onClick={toggleSelectMode} variant={selectMode ? 'ghost' : 'secondary'}>
                        {selectMode ? 'Seçimi İptal' : 'Yazdır'}
                    </Button>
                    {!selectMode && (
                        <Button icon={Plus} onClick={() => setAssignOpen(true)}>
                            Zimmet Ata
                        </Button>
                    )}
                </div>
            </div>

            {/* Search bar + select all */}
            <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                {selectMode && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                        <input type="checkbox" checked={filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))} onChange={handleToggleAll} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>Tümünü Seç</span>
                    </label>
                )}
                <div style={{ position: 'relative', maxWidth: 400, flex: 1 }}>
                    <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Kişi adı, marka, model veya seri no ile ara..."
                        className="input"
                        style={{ paddingLeft: 44 }}
                    />
                </div>
            </div>

            {/* Assignment List */}
            {filtered.length === 0 ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <ClipboardList />
                        <p>{searchQuery ? 'Aramayla eşleşen zimmet bulunamadı.' : 'Henüz zimmet atanmadı.'}</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map((a) => {
                        const isExpanded = expandedId === a.id;
                        return (
                            <div key={a.id} className="glass-card" style={{ overflow: 'hidden', border: selectMode && selectedIds.has(a.id) ? '1px solid rgba(99,102,241,0.3)' : undefined, transition: 'border 0.15s ease' }}>
                                {/* Main Row */}
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        flexWrap: 'wrap', gap: 16, padding: 24, cursor: 'pointer',
                                    }}
                                    onClick={() => selectMode ? handleToggleSelect(a.id) : toggleExpand(a)}
                                >
                                    {/* Left */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 }}>
                                        {selectMode && (
                                            <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => handleToggleSelect(a.id)} onClick={(e) => e.stopPropagation()} style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }} />
                                        )}
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 14,
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Monitor style={{ width: 22, height: 22, color: '#818cf8' }} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                                                {a.computer_brand} {a.computer_model}
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <User style={{ width: 14, height: 14, color: '#6366f1' }} />
                                                    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{a.employee_name || `Personel #${a.employee_id}`}</span>
                                                </div>
                                                {a.computer_serial && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <HardDrive style={{ width: 14, height: 14, color: '#475569' }} />
                                                        <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{a.computer_serial}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Calendar style={{ width: 14, height: 14, color: '#475569' }} />
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>{a.assigned_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right */}
                                    {!selectMode && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                                            <Badge status="ASSIGNED" />
                                            <button
                                                onClick={() => openTransfer(a)}
                                                title="Başka Kişiye Aktar"
                                                style={{
                                                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                                                    borderRadius: 10, padding: 8, cursor: 'pointer', color: '#818cf8',
                                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <ArrowRightLeft style={{ width: 16, height: 16 }} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(a.id)}
                                                title="Zimmeti Sil"
                                                style={{
                                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                                                    borderRadius: 10, padding: 8, cursor: 'pointer', color: '#f87171',
                                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <Trash2 style={{ width: 16, height: 16 }} />
                                            </button>
                                            {isExpanded
                                                ? <ChevronUp style={{ width: 18, height: 18, color: '#475569' }} />
                                                : <ChevronDown style={{ width: 18, height: 18, color: '#475569' }} />
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Detail + History */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0 24px 24px', borderTop: '1px solid rgba(99,102,241,0.06)',
                                        animation: 'pageSlide 0.25s ease-out',
                                    }}>
                                        {/* Computer Details */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                            gap: 12, marginTop: 20,
                                        }}>
                                            {detailData ? (
                                                <>
                                                    <DetailItem label="Marka" value={detailData.brand} />
                                                    <DetailItem label="Model" value={detailData.model} />
                                                    <DetailItem label="Seri No" value={detailData.serial_no} icon={<HardDrive style={{ width: 13, height: 13, color: '#475569' }} />} mono />
                                                    <DetailItem label="RAM" value={detailData.specifications?.ram || '—'} icon={<Cpu style={{ width: 13, height: 13, color: '#475569' }} />} />
                                                    <DetailItem label="CPU" value={detailData.specifications?.cpu || '—'} icon={<Cpu style={{ width: 13, height: 13, color: '#475569' }} />} />
                                                    <DetailItem label="PC Adı" value={detailData.computer_name || '—'} />
                                                    <DetailItem label="Durum" value={<Badge status={detailData.status} />} />
                                                    <DetailItem label="Şu An Kimde" value={a.employee_name} icon={<User style={{ width: 13, height: 13, color: '#6366f1' }} />} highlight />
                                                </>
                                            ) : (
                                                <p style={{ color: '#475569', fontSize: 13, gridColumn: '1 / -1' }}>Bilgisayar detayları yükleniyor...</p>
                                            )}
                                        </div>

                                        {/* Assignment History */}
                                        {historyData.length > 1 && (
                                            <div style={{ marginTop: 20 }}>
                                                <h4 style={{
                                                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                                    letterSpacing: '0.12em', color: '#64748b', marginBottom: 12,
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                }}>
                                                    <History style={{ width: 14, height: 14 }} />
                                                    Zimmet Geçmişi
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {historyData.map((h) => {
                                                        const isCurrent = !h.returned_date;
                                                        return (
                                                            <div
                                                                key={h.id}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                    padding: '10px 14px', borderRadius: 10,
                                                                    backgroundColor: isCurrent ? 'rgba(99,102,241,0.06)' : 'rgba(8,12,28,0.4)',
                                                                    border: isCurrent ? '1px solid rgba(99,102,241,0.12)' : '1px solid transparent',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <div style={{
                                                                        width: 6, height: 6, borderRadius: '50%',
                                                                        background: isCurrent ? '#10b981' : '#475569',
                                                                        boxShadow: isCurrent ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                                                                    }} />
                                                                    <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#e2e8f0' : '#94a3b8' }}>
                                                                        {h.employee_name || `Personel #${h.employee_id}`}
                                                                    </span>
                                                                    {isCurrent && (
                                                                        <span style={{
                                                                            fontSize: 10, fontWeight: 700, color: '#10b981',
                                                                            background: 'rgba(16,185,129,0.1)', padding: '2px 8px',
                                                                            borderRadius: 6, textTransform: 'uppercase',
                                                                        }}>
                                                                            Aktif
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                                                                    {h.assigned_date}
                                                                    {h.returned_date && <span> → {h.returned_date}</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Assignment Modal */}
            <AssignmentModal
                isOpen={assignOpen}
                onClose={() => setAssignOpen(false)}
                onSuccess={() => fetchAssignments()}
            />

            {/* Transfer Modal */}
            {transferId && (
                <div
                    onClick={() => setTransferId(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#111827', border: '1px solid #1e293b',
                            borderRadius: 16, padding: 32, width: '100%', maxWidth: 400,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: 'rgba(99,102,241,0.15)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ArrowRightLeft style={{ width: 20, height: 20, color: '#818cf8' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Zimmeti Aktar</h2>
                                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                                        {assignments.find((x) => x.id === transferId)?.computer_brand}{' '}
                                        {assignments.find((x) => x.id === transferId)?.computer_model}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setTransferId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 8 }}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                            Şu an: <strong style={{ color: '#e2e8f0' }}>{assignments.find((x) => x.id === transferId)?.employee_name}</strong>
                        </p>

                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                            Yeni Personel
                        </label>
                        <div style={{ marginBottom: 24 }}>
                            <SearchableSelect
                                options={employees.map((emp) => ({
                                    value: String(emp.id),
                                    label: emp.full_name,
                                    sub: emp.department || '',
                                }))}
                                value={newEmployeeId}
                                onChange={setNewEmployeeId}
                                placeholder="Personel ara veya seç..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                            <button
                                onClick={() => setTransferId(null)}
                                style={{
                                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                                    background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b',
                                    borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={transferring || !newEmployeeId}
                                style={{
                                    padding: '10px 24px', fontSize: 13, fontWeight: 600,
                                    background: (!newEmployeeId || transferring) ? '#374151' : '#6366f1', color: 'white',
                                    border: 'none', borderRadius: 10,
                                    cursor: (!newEmployeeId || transferring) ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Inter, sans-serif', opacity: (!newEmployeeId || transferring) ? 0.6 : 1,
                                }}
                            >
                                {transferring ? 'Aktarılıyor...' : 'Aktar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating selection bar */}
            {selectMode && selectedIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderRadius: 16, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.1)', zIndex: 100, animation: 'pageSlide 0.25s ease-out' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{selectedIds.size}</span>
                        zimmet seçildi
                    </span>
                    <Button icon={Printer} onClick={handlePrint}>Seçilenleri Yazdır</Button>
                </div>
            )}
        </div>
    );
}

/* Small helper component for detail grid items */
function DetailItem({ label, value, icon, mono, highlight }) {
    return (
        <div style={{
            padding: '14px 16px', borderRadius: 12,
            backgroundColor: 'rgba(8,12,28,0.5)',
            border: highlight ? '1px solid rgba(99,102,241,0.12)' : '1px solid transparent',
        }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>
                {label}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon}
                {typeof value === 'string' ? (
                    <p style={{
                        fontSize: 14, fontWeight: 600, color: highlight ? '#a5b4fc' : '#e2e8f0',
                        fontFamily: mono ? 'monospace' : 'inherit',
                    }}>
                        {value}
                    </p>
                ) : value}
            </div>
        </div>
    );
}
