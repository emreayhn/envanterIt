/**
 * Page: DynamicInventory — generic inventory page driven by category config.
 * Reads category slug from URL, fetches column config from API,
 * renders form/table/CSV/print with only the configured columns.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, X, Save, Upload, FileSpreadsheet, AlertTriangle, CheckCircle,
    ArrowLeft, Printer, Trash2, Edit, Search, ArrowUpDown, Package,
} from 'lucide-react';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import AppModal from '../components/atoms/AppModal';
import {
    getCategoryBySlug, getCategoryItems, createCategoryItem,
    updateCategoryItem, deleteCategoryItem, bulkCreateCategoryItems, getAssignments,
} from '../services/api';

/* ── Column meta ────────────────────────────────────── */
const COLUMN_META = {
    name: { label: 'Ad', placeholder: 'Cihaz adı' },
    brand: { label: 'Marka', placeholder: 'HP, Dell, Samsung...' },
    model: { label: 'Model', placeholder: 'Model numarası' },
    serial_no: { label: 'Seri No', placeholder: 'SN-2024-00001' },
    ram: { label: 'RAM', placeholder: '16GB' },
    cpu: { label: 'CPU', placeholder: 'i7-13700' },
    wifi_mac: { label: 'Wi-Fi MAC', placeholder: 'AA:BB:CC:DD:EE:FF' },
    ethernet_mac: { label: 'Ethernet MAC', placeholder: '11:22:33:44:55:66' },
    tesis: { label: 'Tesis', placeholder: 'Merkez Bina' },
    lokasyon: { label: 'Lokasyon', placeholder: 'Kat 3 - IT Odası' },
};

const statusOptions = [
    { value: 'STOCK', label: 'Stokta' },
    { value: 'ASSIGNED', label: 'Zimmetli' },
];

/* ── CSV helpers ────────────────────────────────────── */
function splitCSVLine(line, sep) {
    const cols = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false; }
            else current += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === sep) { cols.push(current.trim()); current = ''; }
            else current += ch;
        }
    }
    cols.push(current.trim());
    return cols;
}

function buildHeaderMap(columns) {
    const map = {};
    columns.forEach((col) => {
        const meta = COLUMN_META[col];
        if (!meta) return;
        map[col] = col;
        map[meta.label.toLowerCase()] = col;
        map[meta.label.toLowerCase().replace(/ /g, '_')] = col;
    });
    // Common aliases
    map['seri_no'] = 'serial_no'; map['seri no'] = 'serial_no'; map['serial'] = 'serial_no'; map['serino'] = 'serial_no';
    map['marka'] = 'brand'; map['ad'] = 'name'; map['isim'] = 'name';
    map['wifi mac'] = 'wifi_mac'; map['wi-fi mac'] = 'wifi_mac'; map['wifimac'] = 'wifi_mac';
    map['ethernet mac'] = 'ethernet_mac'; map['ethernetmac'] = 'ethernet_mac';
    map['durum'] = 'status'; map['status'] = 'status';
    return map;
}

function parseCSV(text, columns, categoryId) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = firstLine.includes(';') ? ';' : ',';
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headerMap = buildHeaderMap(columns);
    const rawHeaders = splitCSVLine(lines[0], sep).map((h) => h.toLowerCase().replace(/['"]/g, ''));
    const mappedHeaders = rawHeaders.map((h) => headerMap[h] || null);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i], sep);
        const row = {};
        mappedHeaders.forEach((field, idx) => { if (field && cols[idx]) row[field] = cols[idx]; });
        if (row.serial_no) {
            const item = { category_id: categoryId, serial_no: row.serial_no, status: row.status || 'STOCK' };
            columns.forEach((col) => { if (col !== 'serial_no' && row[col]) item[col] = row[col]; });
            rows.push(item);
        }
    }
    return rows;
}


export default function DynamicInventory() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const statusFromUrl = searchParams.get('status') || '';

    // Category config
    const [category, setCategory] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
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

    const columns = category?.columns || [];

    const emptyForm = useCallback(() => {
        const f = { status: 'STOCK', fault_description: '' };
        columns.forEach((col) => { f[col] = ''; });
        return f;
    }, [columns]);

    // ── Fetch ────────────────────────
    const fetchCategory = async () => {
        try {
            const { data } = await getCategoryBySlug(slug);
            setCategory(data);
        } catch {
            setCategory(null);
        }
    };

    const fetchItems = useCallback(async () => {
        if (!category) return;
        try {
            const { data } = await getCategoryItems(slug);
            setItems(data);
        } catch { /* ignore */ }
    }, [slug, category]);

    const [assignedByItem, setAssignedByItem] = useState({});
    useEffect(() => { fetchCategory(); }, [slug]);
    useEffect(() => {
        if (category) {
            fetchItems();
            setLoading(false);
            getAssignments().then((r) => {
                const map = {};
                r.data.forEach((a) => { if (a.item_id) map[a.item_id] = a.employee_name; });
                setAssignedByItem(map);
            }).catch(() => {});
        }
    }, [category]);

    // ── Derived ────────────────────────
    const filtered = items
        .filter((item) => {
            if (statusFromUrl && item.status !== statusFromUrl) return false;
            const q = search.toLowerCase();
            return columns.some((col) => (item[col] || '').toLowerCase().includes(q));
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

    // ── Form handlers ────────────────
    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const openNew = () => { setEditingId(null); setForm(emptyForm()); setHasFault(false); setShowForm(true); setShowCsvImport(false); };

    const openEdit = (item) => {
        setEditingId(item.id);
        const f = { status: item.status || 'STOCK', fault_description: item.fault_description || '' };
        columns.forEach((col) => { f[col] = item[col] || ''; });
        setForm(f);
        setHasFault(!!item.fault_description);
        setShowForm(true); setShowCsvImport(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, category_id: category.id };
            if (editingId) await updateCategoryItem(editingId, payload);
            else await createCategoryItem(slug, payload);
            setShowForm(false); setForm(emptyForm()); setEditingId(null);
            fetchItems();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Bir hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        } finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        const item = items.find((x) => x.id === id);
        setModal({
            open: true, title: 'Kayıt Sil',
            message: `"${item?.name || item?.brand || ''} (${item?.serial_no})" kaydını silmek istediğinize emin misiniz?`,
            type: 'confirm', details: null,
            onConfirm: async () => {
                closeModal();
                try { await deleteCategoryItem(id); fetchItems(); }
                catch (err) { setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'Silme başarısız.', type: 'error', details: null, onConfirm: closeModal }); }
            },
        });
    };

    const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm()); };

    // ── CSV handlers ────────────────
    const openCsvImport = () => { setShowCsvImport(true); setShowForm(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const closeCsvImport = () => { setShowCsvImport(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const handleFile = (file) => {
        if (!file || !category) return;
        setCsvResult(null); setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setCsvRows(parseCSV(ev.target.result, columns, category.id));
        reader.readAsText(file, 'UTF-8');
    };
    const onFileInput = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); };
    const handleCsvUpload = async () => {
        if (csvRows.length === 0) return;
        setCsvUploading(true); setCsvResult(null);
        try { const { data } = await bulkCreateCategoryItems(slug, csvRows); setCsvResult(data); fetchItems(); }
        catch (err) { setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'CSV yükleme hatası.', type: 'error', details: null, onConfirm: closeModal }); }
        finally { setCsvUploading(false); }
    };
    const removeCsvRow = (idx) => setCsvRows((r) => r.filter((_, i) => i !== idx));

    // ── Print handlers ────────────────
    const toggleSelectMode = () => {
        if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
        else { setSelectMode(true); setShowForm(false); setShowCsvImport(false); }
    };
    const handleToggleSelect = (id) => {
        setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };
    const handleToggleAll = () => {
        const allSelected = filtered.every((p) => selectedIds.has(p.id));
        setSelectedIds(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
    };
    const handlePrint = () => {
        const selected = items.filter((p) => selectedIds.has(p.id));
        if (selected.length === 0) return;
        const thRow = columns.map((col) => `<th>${COLUMN_META[col]?.label || col}</th>`).join('') + '<th>Durum</th>';
        const rows = selected.map((item) => {
            const tds = columns.map((col) => `<td>${item[col] || '—'}</td>`).join('');
            return `<tr>${tds}<td>${item.status === 'STOCK' ? 'Stokta' : item.status === 'ASSIGNED' ? 'Zimmetli' : item.status}</td></tr>`;
        }).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${category.name} Envanter Listesi</title>
        <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:30px;color:#1e293b}h1{font-size:20px;margin-bottom:4px}.subtitle{font-size:12px;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569}td{padding:7px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.footer{margin-top:24px;font-size:11px;color:#94a3b8}@media print{body{margin:15px}}</style></head><body>
        <h1>${category.name} Envanter Listesi</h1>
        <p class="subtitle">Toplam ${selected.length} kayıt · Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
        <table><thead><tr>${thRow}</tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">IT Envanter Takip Sistemi</div></body></html>`;
        const w = window.open('', '_blank', 'width=900,height=600');
        w.document.write(html); w.document.close(); w.focus();
        setTimeout(() => w.print(), 300);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>;
    if (!category) return <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>Kategori bulunamadı.</div>;

    const allTableCols = [...columns, 'status'];
    const colSpan = allTableCols.length + 2 + (selectMode ? 1 : 0); // id + columns + status + actions + checkbox

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
                            <span className="page-title-icon"><Package style={{ width: 18, height: 18 }} /></span>
                            {category.name}
                        </h2>
                    </div>
                    <p className="page-subtitle">{category.name} cihazlarını yönetin</p>
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
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }} />
                        CSV ile Toplu Ekle
                    </h3>
                    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}
                        style={{ border: `2px dashed ${isDragging ? '#10b981' : 'rgba(16,185,129,0.15)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.02)', transition: 'all 0.25s', marginBottom: 20 }}>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={onFileInput} style={{ display: 'none' }} />
                        <FileSpreadsheet style={{ width: 36, height: 36, color: isDragging ? '#10b981' : '#334155', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? '#6ee7b7' : '#94a3b8' }}>
                            {isDragging ? 'Dosyayı bırakın...' : 'CSV dosyasını sürükleyin veya tıklayın'}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Kolonlar: {columns.join(', ')}</p>
                    </div>
                    {csvFileName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <FileSpreadsheet style={{ width: 16, height: 16, color: '#10b981' }} />
                            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{csvFileName}</span>
                            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>{csvRows.length} kayıt</span>
                        </div>
                    )}
                    {csvRows.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 12, border: '1px solid rgba(16,185,129,0.08)' }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th>{columns.map((c) => <th key={c}>{COLUMN_META[c]?.label || c}</th>)}<th></th></tr></thead>
                                <tbody>
                                    {csvRows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#475569' }}>{i + 1}</td>
                                            {columns.map((c) => <td key={c} style={{ color: '#94a3b8' }}>{r[c] || '—'}</td>)}
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
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{csvResult.created_count} kayıt başarıyla eklendi{csvResult.skipped_count > 0 && `, ${csvResult.skipped_count} adet atlandı`}</p>
                                {csvResult.skipped_serials?.length > 0 && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Atlanan: {csvResult.skipped_serials.join(', ')}</p>}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(16,185,129,0.06)' }}>
                        <Button variant="ghost" onClick={closeCsvImport}>İptal</Button>
                        <Button icon={Upload} onClick={handleCsvUpload} loading={csvUploading} disabled={csvRows.length === 0}>{csvRows.length} Kayıt Ekle</Button>
                    </div>
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: editingId ? '#f59e0b' : '#10b981', boxShadow: editingId ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(16,185,129,0.4)' }} />
                        {editingId ? `Düzenle — #${editingId}` : `Yeni ${category.name} Ekle`}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {columns.map((col) => (
                            <div key={col}>
                                <label className="form-label">{COLUMN_META[col]?.label || col}</label>
                                <input name={col} placeholder={COLUMN_META[col]?.placeholder || ''} value={form[col] || ''} onChange={handleChange} className="input" />
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
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginBottom: 12 }}>
                                    <input type="checkbox" checked={hasFault} onChange={(e) => { setHasFault(e.target.checked); if (!e.target.checked) setForm((f) => ({ ...f, fault_description: '' })); }} style={{ width: 18, height: 18, accentColor: '#f87171', cursor: 'pointer' }} />
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>Arıza Kaydı Var</span>
                                </label>
                                {hasFault && (
                                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#f87171' }}>⚠</span> Arıza Açıklaması</label>
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
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${columns.map((c) => COLUMN_META[c]?.label || c).join(', ')} ile ara...`} className="input" style={{ paddingLeft: 44 }} />
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                {selectMode && (
                                    <th style={{ width: 42, textAlign: 'center' }}>
                                        <input type="checkbox" checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))} onChange={handleToggleAll} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                                    </th>
                                )}
                                <th onClick={() => toggleSort('id')} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>ID <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === 'id' ? 1 : 0.3 }} /></span>
                                </th>
                                {columns.map((col) => (
                                    <th key={col} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {COLUMN_META[col]?.label || col}
                                            <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === col ? 1 : 0.3 }} />
                                        </span>
                                    </th>
                                ))}
                                <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Durum <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === 'status' ? 1 : 0.3 }} /></span>
                                </th>
                                <th>Zimmetli Personel</th>
                                {!selectMode && <th>İşlem</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={colSpan}><div className="empty-state"><Package /><p>Kayıt bulunamadı.</p></div></td></tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id}
                                        onClick={() => selectMode && handleToggleSelect(item.id)}
                                        style={{ cursor: selectMode ? 'pointer' : undefined, background: selectMode && selectedIds.has(item.id) ? 'rgba(99,102,241,0.10)' : undefined, transition: 'background 0.15s ease' }}>
                                        {selectMode && (
                                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => handleToggleSelect(item.id)} style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                                            </td>
                                        )}
                                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: 12 }}>#{item.id}</td>
                                        {columns.map((col) => (
                                            <td key={col} style={{
                                                fontWeight: col === 'name' || col === 'brand' ? 600 : 400,
                                                color: col === 'name' || col === 'brand' ? '#e2e8f0' : '#94a3b8',
                                                fontFamily: ['serial_no', 'wifi_mac', 'ethernet_mac'].includes(col) ? 'monospace' : 'inherit',
                                                fontSize: ['serial_no', 'wifi_mac', 'ethernet_mac'].includes(col) ? 12 : 13,
                                                letterSpacing: col === 'serial_no' ? '0.05em' : undefined,
                                            }}>
                                                {item[col] || '—'}
                                            </td>
                                        ))}
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Badge status={item.status} />
                                                {item.fault_description && <span title={item.fault_description}><AlertTriangle style={{ width: 14, height: 14, color: '#f87171', animation: 'pulse 2s infinite' }} /></span>}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: assignedByItem[item.id] ? '#a5b4fc' : '#334155' }}>
                                            {assignedByItem[item.id] || '—'}
                                        </td>
                                        {!selectMode && (
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><Edit style={{ width: 15, height: 15 }} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}><Trash2 style={{ width: 15, height: 15 }} /></button>
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
                        kayıt seçildi
                    </span>
                    <Button icon={Printer} onClick={handlePrint}>Seçilenleri Yazdır</Button>
                </div>
            )}
        </div>
    );
}
