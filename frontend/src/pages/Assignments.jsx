/**
 * Page: Assignments — zimmet listesi, yeni zimmet, detay+geçmiş, transfer, arama, CSV import.
 */
import { useEffect, useState, useRef } from 'react';
import {
    ClipboardList, Monitor, User, Calendar, UserCheck,
    Trash2, Plus, ChevronDown, ChevronUp, ArrowRightLeft, X,
    Cpu, HardDrive, Search, History, Printer, Upload, FileSpreadsheet, AlertTriangle, CheckCircle,
} from 'lucide-react';
import useStore from '../store/useStore';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import AssignmentModal from '../components/organisms/AssignmentModal';
import SearchableSelect from '../components/molecules/SearchableSelect';
import {
    deleteAssignment, createAssignment,
    getEmployees, getComputer, getAssignmentHistory, bulkCreateAssignments,
} from '../services/api';

/* ── CSV parsing for zimmet ──────────────────────────── */
const HEADER_MAP = {
    'serial_no': 'serial_no', 'seri_no': 'serial_no', 'seri no': 'serial_no', 'serial': 'serial_no', 'serial number': 'serial_no',
    'full_name': 'full_name', 'personel_adi': 'full_name', 'personel adi': 'full_name', 'ad_soyad': 'full_name', 'ad soyad': 'full_name', 'display name': 'full_name', 'primary user display name': 'full_name',
    'email': 'email', 'e-posta': 'email', 'eposta': 'email', 'user principal name': 'email', 'primary user email address': 'email',
};

function splitCSVLine(line, sep) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = false;
            } else current += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === sep) { cols.push(current.trim()); current = ''; }
            else current += ch;
        }
    }
    cols.push(current.trim());
    return cols;
}

function parseAssignmentCSV(text) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = firstLine.includes(';') ? ';' : ',';
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const rawHeaders = splitCSVLine(lines[0], sep).map((h) => h.toLowerCase().replace(/['"]/g, ''));
    const mappedHeaders = rawHeaders.map((h) => HEADER_MAP[h] || null);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i], sep);
        if (cols.length < 2) continue;
        const row = {};
        mappedHeaders.forEach((field, idx) => {
            if (field && cols[idx]) row[field] = cols[idx];
        });
        if (row.serial_no && (row.email || row.full_name)) {
            rows.push({
                serial_no: row.serial_no,
                full_name: row.full_name || '',
                email: row.email || '',
            });
        }
    }
    return rows;
}

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

    // CSV import state
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvRows, setCsvRows] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => { fetchAssignments(); }, []);

    // CSV handlers
    const openCsvImport = () => { setShowCsvImport(true); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const closeCsvImport = () => { setShowCsvImport(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const handleCsvFile = (file) => {
        if (!file) return;
        setCsvResult(null); setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setCsvRows(parseAssignmentCSV(ev.target.result));
        reader.readAsText(file, 'UTF-8');
    };
    const handleCsvUpload = async () => {
        if (csvRows.length === 0) return;
        setCsvUploading(true); setCsvResult(null);
        try {
            const { data } = await bulkCreateAssignments(csvRows);
            setCsvResult(data);
            fetchAssignments();
        } catch (err) { console.error(err); }
        finally { setCsvUploading(false); }
    };
    const removeCsvRow = (idx) => setCsvRows((r) => r.filter((_, i) => i !== idx));

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
                        <>
                            <Button icon={Upload} onClick={showCsvImport ? closeCsvImport : openCsvImport} variant={showCsvImport ? 'ghost' : undefined}>
                                {showCsvImport ? 'CSV Kapat' : 'CSV ile Aktar'}
                            </Button>
                            <Button icon={Plus} onClick={() => setAssignOpen(true)}>
                                Zimmet Ata
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* CSV Import */}
            {showCsvImport && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.4)' }} />
                        CSV ile Toplu Zimmet Atama
                    </h3>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleCsvFile(e.dataTransfer.files[0]); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: `2px dashed ${isDragging ? '#f59e0b' : 'rgba(245,158,11,0.15)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.02)', transition: 'all 0.25s', marginBottom: 20 }}
                    >
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={(e) => { handleCsvFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                        <FileSpreadsheet style={{ width: 36, height: 36, color: isDragging ? '#f59e0b' : '#334155', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? '#fbbf24' : '#94a3b8' }}>
                            {isDragging ? 'Dosyayı bırakın...' : 'CSV dosyasını sürükleyin veya tıklayın'}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Kolonlar: serial_no, full_name, email</p>
                    </div>
                    {csvFileName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <FileSpreadsheet style={{ width: 16, height: 16, color: '#f59e0b' }} />
                            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{csvFileName}</span>
                            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>{csvRows.length} kayıt</span>
                        </div>
                    )}
                    {csvRows.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 12, border: '1px solid rgba(245,158,11,0.08)' }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th><th>Seri No</th><th>Personel Adı</th><th>E-posta</th><th></th></tr></thead>
                                <tbody>
                                    {csvRows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#475569' }}>{i + 1}</td>
                                            <td style={{ fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 600 }}>{r.serial_no}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.full_name || '—'}</td>
                                            <td style={{ color: '#64748b', fontSize: 11 }}>{r.email || '—'}</td>
                                            <td><button onClick={() => removeCsvRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {csvResult && (
                        <div style={{ padding: '14px 20px', borderRadius: 12, marginBottom: 16, background: csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                {csvResult.skipped_count > 0 ? <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} /> : <CheckCircle style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0, marginTop: 2 }} />}
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                        {csvResult.created_count} zimmet başarıyla oluşturuldu
                                        {csvResult.skipped_count > 0 && `, ${csvResult.skipped_count} adet atlandı`}
                                    </p>
                                    {csvResult.skipped?.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            {csvResult.skipped.map((s, i) => (
                                                <p key={i} style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                                                    {s.serial_no}: {s.reason}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(245,158,11,0.06)' }}>
                        <Button variant="ghost" onClick={closeCsvImport}>İptal</Button>
                        <Button icon={Upload} onClick={handleCsvUpload} loading={csvUploading} disabled={csvRows.length === 0}>{csvRows.length} Zimmet Ata</Button>
                    </div>
                </div>
            )}

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
