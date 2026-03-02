/**
 * Page: Kiosks — kiosk ekleme, düzenleme, silme + CSV toplu import + yazdır.
 */
import { useEffect, useState, useRef } from 'react';
import { Plus, X, Laptop, Save, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowLeft, Printer, Trash2, Edit, Search, ArrowUpDown, ChevronDown, ChevronUp, Hash, Calendar, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import AppModal from '../components/atoms/AppModal';
import { createKiosk, updateKiosk, deleteKiosk, bulkCreateKiosks } from '../services/api';

const emptyForm = {
    hostname: '', serial_no: '', wifi_mac: '', ethernet_mac: '',
    tesis: '', lokasyon: '', status: 'STOCK', fault_description: '',
};

const fields = [
    { name: 'hostname', label: 'Hostname', placeholder: 'KIOSK-001' },
    { name: 'serial_no', label: 'Seri No', placeholder: 'KSK-2024-00001' },
    { name: 'wifi_mac', label: 'Wi-Fi MAC', placeholder: 'AA:BB:CC:DD:EE:FF' },
    { name: 'ethernet_mac', label: 'Ethernet MAC', placeholder: '11:22:33:44:55:66' },
    { name: 'tesis', label: 'Tesis', placeholder: 'Merkez Bina' },
    { name: 'lokasyon', label: 'Lokasyon', placeholder: 'Kat 3 - Giriş' },
];

const statusOptions = [
    { value: 'STOCK', label: 'Stokta' },
    { value: 'ASSIGNED', label: 'Zimmetli' },
];

/* ── CSV column mapping ──────────────────────────────── */
const HEADER_MAP = {
    'hostname': 'hostname', 'host_name': 'hostname', 'host': 'hostname',
    'kiosk_adi': 'hostname', 'kiosk adi': 'hostname', 'kiosk_name': 'hostname',
    'seri_no': 'serial_no', 'seri no': 'serial_no', 'serial_no': 'serial_no',
    'serial': 'serial_no', 'serino': 'serial_no',
    'wifi_mac': 'wifi_mac', 'wifi mac': 'wifi_mac', 'wi-fi mac': 'wifi_mac', 'wifimac': 'wifi_mac',
    'ethernet_mac': 'ethernet_mac', 'ethernet mac': 'ethernet_mac', 'ethernetmac': 'ethernet_mac',
    'tesis': 'tesis', 'facility': 'tesis',
    'lokasyon': 'lokasyon', 'location': 'lokasyon',
    'durum': 'status', 'status': 'status',
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

function parseCSV(text) {
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
        if (row.hostname && row.serial_no) {
            rows.push({
                hostname: row.hostname,
                serial_no: row.serial_no,
                wifi_mac: row.wifi_mac || '',
                ethernet_mac: row.ethernet_mac || '',
                tesis: row.tesis || '',
                lokasyon: row.lokasyon || '',
                status: row.status || 'STOCK',
            });
        }
    }
    return rows;
}

export default function Kiosks() {
    const navigate = useNavigate();
    const { kiosks, fetchKiosks } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [hasFault, setHasFault] = useState(false);

    // CSV
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvRows, setCsvRows] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Print/select
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Table
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('id');
    const [sortDir, setSortDir] = useState('desc');

    // Modal
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', details: null, onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    useEffect(() => { fetchKiosks(); }, []);

    const filtered = kiosks
        .filter((k) => {
            const q = search.toLowerCase();
            return k.hostname?.toLowerCase().includes(q) || k.serial_no?.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            const aVal = a[sortField] ?? '';
            const bVal = b[sortField] ?? '';
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

    const toggleSort = (field) => {
        if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('asc'); }
    };

    // ── Form handlers ─────────────────
    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const openNew = () => { setEditingId(null); setForm({ ...emptyForm }); setHasFault(false); setShowForm(true); setShowCsvImport(false); };
    const openEdit = (kiosk) => {
        setEditingId(kiosk.id);
        setForm({ hostname: kiosk.hostname || '', serial_no: kiosk.serial_no || '', wifi_mac: kiosk.wifi_mac || '', ethernet_mac: kiosk.ethernet_mac || '', tesis: kiosk.tesis || '', lokasyon: kiosk.lokasyon || '', status: kiosk.status || 'STOCK', fault_description: kiosk.fault_description || '' });
        setHasFault(!!kiosk.fault_description);
        setShowForm(true); setShowCsvImport(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) await updateKiosk(editingId, form);
            else await createKiosk(form);
            setShowForm(false); setForm({ ...emptyForm }); setEditingId(null);
            fetchKiosks();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Bir hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        } finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        const k = kiosks.find((x) => x.id === id);
        setModal({
            open: true, title: 'Kiosk Sil',
            message: `"${k?.hostname} (${k?.serial_no})" kiosk'u silmek istediğinize emin misiniz?`,
            type: 'confirm', details: null,
            onConfirm: async () => {
                closeModal();
                try { await deleteKiosk(id); fetchKiosks(); }
                catch (err) {
                    setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Silme başarısız.', type: 'error', details: null, onConfirm: closeModal });
                }
            },
        });
    };

    const handleCancel = () => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); };

    // ── CSV handlers ─────────────────
    const openCsvImport = () => { setShowCsvImport(true); setShowForm(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const closeCsvImport = () => { setShowCsvImport(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const handleFile = (file) => {
        if (!file) return;
        setCsvResult(null); setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setCsvRows(parseCSV(ev.target.result));
        reader.readAsText(file, 'UTF-8');
    };
    const onFileInput = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); };
    const handleCsvUpload = async () => {
        if (csvRows.length === 0) return;
        setCsvUploading(true); setCsvResult(null);
        try { const { data } = await bulkCreateKiosks(csvRows); setCsvResult(data); fetchKiosks(); }
        catch (err) { setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'CSV yükleme hatası.', type: 'error', details: null, onConfirm: closeModal }); }
        finally { setCsvUploading(false); }
    };
    const removeCsvRow = (idx) => setCsvRows((r) => r.filter((_, i) => i !== idx));

    // ── Print handlers ─────────────────
    const toggleSelectMode = () => {
        if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
        else { setSelectMode(true); setShowForm(false); setShowCsvImport(false); }
    };
    const handleToggleSelect = (id) => {
        setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };
    const handleToggleAll = () => {
        const allSelected = filtered.every((k) => selectedIds.has(k.id));
        setSelectedIds(allSelected ? new Set() : new Set(filtered.map((k) => k.id)));
    };
    const handlePrint = () => {
        const selected = kiosks.filter((k) => selectedIds.has(k.id));
        if (selected.length === 0) return;
        const rows = selected.map((k) => `<tr><td>${k.hostname}</td><td>${k.serial_no}</td><td>${k.wifi_mac || '—'}</td><td>${k.ethernet_mac || '—'}</td><td>${k.tesis || '—'}</td><td>${k.lokasyon || '—'}</td><td>${k.status === 'STOCK' ? 'Stokta' : k.status === 'ASSIGNED' ? 'Zimmetli' : k.status}</td></tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kiosk Envanter Listesi</title>
        <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:30px;color:#1e293b}h1{font-size:20px;margin-bottom:4px}.subtitle{font-size:12px;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569}td{padding:7px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.footer{margin-top:24px;font-size:11px;color:#94a3b8}@media print{body{margin:15px}}</style></head><body>
        <h1>Kiosk Envanter Listesi</h1>
        <p class="subtitle">Toplam ${selected.length} kiosk · Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
        <table><thead><tr><th>Hostname</th><th>Seri No</th><th>Wi-Fi MAC</th><th>Ethernet MAC</th><th>Tesis</th><th>Lokasyon</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">IT Envanter Takip Sistemi</div></body></html>`;
        const w = window.open('', '_blank', 'width=900,height=600');
        w.document.write(html); w.document.close(); w.focus();
        setTimeout(() => w.print(), 300);
    };

    return (
        <div>
            <AppModal open={modal.open} title={modal.title} message={modal.message} type={modal.type} details={modal.details} onConfirm={modal.onConfirm} onCancel={closeModal} />

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <button onClick={() => navigate('/inventory')} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 10, padding: '7px 9px', cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                            title="Envantere Dön"><ArrowLeft style={{ width: 16, height: 16 }} /></button>
                        <h2 className="page-title">
                            <span className="page-title-icon"><Laptop style={{ width: 18, height: 18 }} /></span>
                            Kiosklar
                        </h2>
                    </div>
                    <p className="page-subtitle">Kiosk cihazlarını yönetin</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button icon={Printer} onClick={toggleSelectMode} variant={selectMode ? 'ghost' : 'secondary'}>
                        {selectMode ? 'Seçimi İptal' : 'Yazdır'}
                    </Button>
                    {!selectMode && (
                        <>
                            <Button icon={Upload} onClick={showCsvImport ? closeCsvImport : openCsvImport} variant={showCsvImport ? 'ghost' : undefined}>
                                {showCsvImport ? 'CSV Kapat' : 'CSV ile Ekle'}
                            </Button>
                            <Button icon={showForm ? X : Plus} onClick={showForm ? handleCancel : openNew}>
                                {showForm ? 'Kapat' : 'Yeni Ekle'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* CSV Import */}
            {showCsvImport && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.4)' }} />
                        CSV ile Toplu Kiosk Ekle
                    </h3>
                    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}
                        style={{ border: `2px dashed ${isDragging ? '#8b5cf6' : 'rgba(139,92,246,0.15)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)', transition: 'all 0.25s', marginBottom: 20 }}>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={onFileInput} style={{ display: 'none' }} />
                        <FileSpreadsheet style={{ width: 36, height: 36, color: isDragging ? '#8b5cf6' : '#334155', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? '#c4b5fd' : '#94a3b8' }}>
                            {isDragging ? 'Dosyayı bırakın...' : 'CSV dosyasını sürükleyin veya tıklayın'}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Kolonlar: hostname, seri_no, durum</p>
                    </div>
                    {csvFileName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <FileSpreadsheet style={{ width: 16, height: 16, color: '#8b5cf6' }} />
                            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{csvFileName}</span>
                            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#c4b5fd' }}>{csvRows.length} kayıt</span>
                        </div>
                    )}
                    {csvRows.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 12, border: '1px solid rgba(139,92,246,0.08)' }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th><th>Hostname</th><th>Seri No</th><th>Durum</th><th></th></tr></thead>
                                <tbody>
                                    {csvRows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#475569' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.hostname}</td>
                                            <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{r.serial_no}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.status}</td>
                                            <td><button onClick={() => removeCsvRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><X style={{ width: 14, height: 14 }} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {csvResult && (
                        <div style={{ padding: '14px 20px', borderRadius: 12, marginBottom: 16, background: csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {csvResult.skipped_count > 0 ? <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} /> : <CheckCircle style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0, marginTop: 2 }} />}
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                    {csvResult.created_count} kiosk başarıyla eklendi
                                    {csvResult.skipped_count > 0 && `, ${csvResult.skipped_count} adet atlandı (tekrar eden seri no)`}
                                </p>
                                {csvResult.skipped_serials?.length > 0 && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Atlanan: {csvResult.skipped_serials.join(', ')}</p>}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(139,92,246,0.06)' }}>
                        <Button variant="ghost" onClick={closeCsvImport}>İptal</Button>
                        <Button icon={Upload} onClick={handleCsvUpload} loading={csvUploading} disabled={csvRows.length === 0}>{csvRows.length} Kiosk Ekle</Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: editingId ? '#f59e0b' : '#10b981', boxShadow: editingId ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(16,185,129,0.4)' }} />
                        {editingId ? `Kiosk Düzenle — #${editingId}` : 'Yeni Kiosk Ekle'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {fields.map((f) => (
                            <div key={f.name}>
                                <label className="form-label">{f.label}</label>
                                <input name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleChange} className="input" />
                            </div>
                        ))}
                        {editingId && (
                            <div>
                                <label className="form-label">Durum</label>
                                <select name="status" value={form.status} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#e2e8f0', backgroundColor: 'rgba(8,12,28,0.8)', border: '1px solid rgba(99,102,241,0.08)', borderRadius: 12, outline: 'none', fontFamily: 'Inter, sans-serif', appearance: 'auto' }}>
                                    {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        )}
                        {editingId && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                                        <input type="checkbox" checked={hasFault} onChange={(e) => { setHasFault(e.target.checked); if (!e.target.checked) setForm((f) => ({ ...f, fault_description: '' })); }} style={{ width: 18, height: 18, accentColor: '#f87171', cursor: 'pointer' }} />
                                        <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>Arıza Kaydı Var</span>
                                    </label>
                                </div>
                                {hasFault && (
                                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#f87171' }}>⚠</span> Arıza Açıklaması
                                        </label>
                                        <textarea name="fault_description" value={form.fault_description} onChange={handleChange} placeholder="Arızayı detaylandırın..." className="input" rows={2} style={{ resize: 'vertical', minHeight: 48, fontFamily: 'Inter, sans-serif', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.04)' }} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={handleCancel} type="button">İptal</Button>
                        <Button type="submit" loading={saving} icon={editingId ? Save : Plus}>{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hostname, seri no ile ara..." className="input" style={{ paddingLeft: 44 }} />
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {selectMode && (
                                    <th style={{ width: 42, textAlign: 'center' }}>
                                        <input type="checkbox" checked={filtered.length > 0 && filtered.every((k) => selectedIds.has(k.id))} onChange={handleToggleAll} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                                    </th>
                                )}
                                {[
                                    { field: 'id', label: 'ID' },
                                    { field: 'hostname', label: 'Hostname' },
                                    { field: 'serial_no', label: 'Seri No' },
                                    { field: 'wifi_mac', label: 'Wi-Fi MAC' },
                                    { field: 'ethernet_mac', label: 'Eth MAC' },
                                    { field: 'tesis', label: 'Tesis' },
                                    { field: 'lokasyon', label: 'Lokasyon' },
                                    { field: 'status', label: 'Durum' },
                                ].map(({ field, label }) => (
                                    <th key={field} onClick={() => toggleSort(field)} style={{ cursor: 'pointer' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {label}
                                            <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === field ? 1 : 0.3 }} />
                                        </span>
                                    </th>
                                ))}
                                {!selectMode && <th>İşlem</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={selectMode ? 10 : 10}><div className="empty-state"><Laptop /><p>Kayıt bulunamadı.</p></div></td></tr>
                            ) : (
                                filtered.map((k) => (
                                    <tr key={k.id}
                                        onClick={() => selectMode && handleToggleSelect(k.id)}
                                        style={{ cursor: selectMode ? 'pointer' : undefined, background: selectMode && selectedIds.has(k.id) ? 'rgba(99,102,241,0.10)' : undefined, transition: 'background 0.15s ease' }}>
                                        {selectMode && (
                                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => handleToggleSelect(k.id)} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                                            </td>
                                        )}
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 12 }}>#{k.id}</td>
                                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{k.hostname}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 12, letterSpacing: '0.05em' }}>{k.serial_no}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{k.wifi_mac || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 11 }}>{k.ethernet_mac || '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{k.tesis || '—'}</td>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{k.lokasyon || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Badge status={k.status} />
                                                {k.fault_description && <span title={k.fault_description}><AlertTriangle style={{ width: 14, height: 14, color: '#f87171', animation: 'pulse 2s infinite' }} /></span>}
                                            </div>
                                        </td>
                                        {!selectMode && (
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <button onClick={() => openEdit(k)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><Edit style={{ width: 15, height: 15 }} /></button>
                                                    <button onClick={() => handleDelete(k.id)} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}><Trash2 style={{ width: 15, height: 15 }} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating selection bar */}
            {selectMode && selectedIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderRadius: 16, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.1)', zIndex: 100, animation: 'pageSlide 0.25s ease-out' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{selectedIds.size}</span>
                        kiosk seçildi
                    </span>
                    <Button icon={Printer} onClick={handlePrint}>Seçilenleri Yazdır</Button>
                </div>
            )}
        </div>
    );
}
