/**
 * Page: Computers — bilgisayar ekleme, düzenleme, silme + CSV toplu import.
 */
import { useEffect, useState, useRef } from 'react';
import { Plus, X, Monitor, Save, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import AssetTable from '../components/organisms/AssetTable';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';
import { createComputer, updateComputer, deleteComputer, getComputerAssignments, bulkCreateComputers, quickCreateEmployee } from '../services/api';

const emptyForm = {
    computer_name: '', brand: '', model: '', serial_no: '',
    wifi_mac: '', ethernet_mac: '', tesis: '', lokasyon: '',
    specifications: { ram: '', cpu: '' }, status: 'STOCK', fault_description: '',
};

const fields = [
    { name: 'computer_name', label: 'Bilgisayar Adı', placeholder: 'PC-IT-001' },
    { name: 'brand', label: 'Marka', placeholder: 'Dell' },
    { name: 'model', label: 'Model', placeholder: 'Latitude 5540' },
    { name: 'serial_no', label: 'Seri No', placeholder: 'SN-2024-00123' },
    { name: 'ram', label: 'RAM', placeholder: '16GB' },
    { name: 'cpu', label: 'CPU', placeholder: 'i7-13700' },
    { name: 'wifi_mac', label: 'Wi-Fi MAC', placeholder: 'AA:BB:CC:DD:EE:FF' },
    { name: 'ethernet_mac', label: 'Ethernet MAC', placeholder: '11:22:33:44:55:66' },
    { name: 'tesis', label: 'Tesis', placeholder: 'Merkez Bina' },
    { name: 'lokasyon', label: 'Lokasyon', placeholder: 'Kat 3 - IT Odası' },
];

const statusOptions = [
    { value: 'STOCK', label: 'Stokta' },
    { value: 'ASSIGNED', label: 'Zimmetli' },
];

/* ── CSV column mapping ────────────────────────────────
   CSV Header → field name  (case-insensitive, trimmed)
   Supports Turkish and English headers.
*/
const HEADER_MAP = {
    'bilgisayar_adi': 'computer_name', 'bilgisayar adi': 'computer_name', 'computer_name': 'computer_name', 'pc_adi': 'computer_name', 'pc adi': 'computer_name',
    'marka': 'brand', 'brand': 'brand',
    'model': 'model',
    'seri_no': 'serial_no', 'seri no': 'serial_no', 'serial_no': 'serial_no', 'serial': 'serial_no', 'serino': 'serial_no',
    'ram': 'ram',
    'cpu': 'cpu', 'islemci': 'cpu', 'işlemci': 'cpu',
    'wifi_mac': 'wifi_mac', 'wifi mac': 'wifi_mac', 'wi-fi mac': 'wifi_mac', 'wifimac': 'wifi_mac',
    'ethernet_mac': 'ethernet_mac', 'ethernet mac': 'ethernet_mac', 'ethernetmac': 'ethernet_mac',
    'tesis': 'tesis', 'facility': 'tesis',
    'lokasyon': 'lokasyon', 'location': 'lokasyon',
    'durum': 'status', 'status': 'status',
    'specifications': 'specifications',
};

/**
 * Parse a single CSV line respecting quoted fields (RFC 4180).
 * Handles commas and escaped quotes ("") inside quoted values.
 */
function splitCSVLine(line, sep) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === sep) {
                cols.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    cols.push(current.trim());
    return cols;
}

function parseCSV(text) {
    // Detect separator: semicolon or comma (check first header line only)
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

        // If a "specifications" JSON column exists, parse ram/cpu from it
        if (row.specifications) {
            try {
                const specs = typeof row.specifications === 'string'
                    ? JSON.parse(row.specifications)
                    : row.specifications;
                if (!row.ram && specs.ram) row.ram = specs.ram;
                if (!row.cpu && specs.cpu) row.cpu = specs.cpu;
            } catch { /* ignore malformed JSON */ }
        }

        // minimum required: brand, model, serial_no
        if (row.brand && row.model && row.serial_no) {
            rows.push({
                computer_name: row.computer_name || '',
                brand: row.brand,
                model: row.model,
                serial_no: row.serial_no,
                wifi_mac: row.wifi_mac || '',
                ethernet_mac: row.ethernet_mac || '',
                tesis: row.tesis || '',
                lokasyon: row.lokasyon || '',
                specifications: { ram: row.ram || '', cpu: row.cpu || '' },
                status: row.status || 'STOCK',
            });
        }
    }
    return rows;
}

export default function Computers() {
    const navigate = useNavigate();
    const { computers, fetchComputers } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });

    // Quick add employee state
    const [quickEmployeeName, setQuickEmployeeName] = useState('');
    const [addingQuickEmployee, setAddingQuickEmployee] = useState(false);

    const [saving, setSaving] = useState(false);
    const [hasFault, setHasFault] = useState(false);

    // CSV import state
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvRows, setCsvRows] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Print/select state
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modal state
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', details: null, onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    useEffect(() => { fetchComputers(); }, []);

    // ── Single form handlers ─────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'ram' || name === 'cpu') {
            setForm((f) => ({ ...f, specifications: { ...f.specifications, [name]: value } }));
        } else {
            setForm((f) => ({ ...f, [name]: value }));
        }
    };

    const openNew = () => { setEditingId(null); setForm({ ...emptyForm }); setHasFault(false); setShowForm(true); setShowCsvImport(false); };

    const openEdit = (computer) => {
        setEditingId(computer.id);
        setForm({
            computer_name: computer.computer_name || '',
            brand: computer.brand || '', model: computer.model || '',
            serial_no: computer.serial_no || '',
            wifi_mac: computer.wifi_mac || '',
            ethernet_mac: computer.ethernet_mac || '',
            tesis: computer.tesis || '',
            lokasyon: computer.lokasyon || '',
            specifications: computer.specifications || { ram: '', cpu: '' },
            status: computer.status || 'STOCK',

            fault_description: computer.fault_description || '',
        });
        setHasFault(!!computer.fault_description);
        setShowForm(true);
        setShowCsvImport(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (editingId) await updateComputer(editingId, payload);
            else await createComputer(payload);
            setShowForm(false); setForm({ ...emptyForm }); setEditingId(null);
            fetchComputers();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Bir hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const pc = computers.find((c) => c.id === id);
        // Check if computer has active assignments
        try {
            const { data: assignments } = await getComputerAssignments(id);
            const names = assignments.map((a) => a.employee_name);
            const msg = names.length > 0
                ? `"${pc?.brand} ${pc?.model} (${pc?.serial_no})" şu an ${names.join(', ')} kişisine zimmetlidir. Yine de silmek istediğinize emin misiniz?`
                : `"${pc?.brand} ${pc?.model} (${pc?.serial_no})" bilgisayarını silmek istediğinize emin misiniz?`;
            setModal({
                open: true,
                title: names.length > 0 ? 'Dikkat — Zimmetli Bilgisayar' : 'Bilgisayar Sil',
                message: msg,
                type: names.length > 0 ? 'warning' : 'confirm',
                details: names.length > 0 ? names.map((n) => `Zimmetli: ${n}`) : null,
                onConfirm: async () => {
                    closeModal();
                    try {
                        await deleteComputer(id);
                        fetchComputers();
                    } catch (err) {
                        const errMsg = err.response?.data?.detail || 'Silme i\u015flemi ba\u015far\u0131s\u0131z.';
                        setModal({ open: true, title: 'Hata', message: errMsg, type: 'error', details: null, onConfirm: closeModal });
                    }
                },
            });
        } catch {
            // If assignment check fails, still allow delete with basic confirm
            setModal({
                open: true,
                title: 'Bilgisayar Sil',
                message: `"${pc?.brand} ${pc?.model}" bilgisayar\u0131n\u0131 silmek istedi\u011finize emin misiniz?`,
                type: 'confirm',
                details: null,
                onConfirm: async () => {
                    closeModal();
                    try { await deleteComputer(id); fetchComputers(); }
                    catch (err) {
                        const errMsg = err.response?.data?.detail || 'Silme i\u015flemi ba\u015far\u0131s\u0131z.';
                        setModal({ open: true, title: 'Hata', message: errMsg, type: 'error', details: null, onConfirm: closeModal });
                    }
                },
            });
        }
    };

    const handleCancel = () => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); setQuickEmployeeName(''); };

    const handleQuickAddEmployee = async () => {
        if (!quickEmployeeName.trim()) {
            setModal({ open: true, title: 'Uyarı', message: 'Lütfen personel adı giriniz.', type: 'warning', details: null, onConfirm: closeModal });
            return;
        }
        setAddingQuickEmployee(true);
        try {
            const { data } = await quickCreateEmployee({ full_name: quickEmployeeName });
            setModal({ open: true, title: 'Başarılı', message: `${data.full_name} başarıyla eklendi.`, type: 'success', details: null, onConfirm: closeModal });
            setQuickEmployeeName('');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Personel eklenirken hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        } finally {
            setAddingQuickEmployee(false);
        }
    };

    // ── CSV import handlers ─────────────────
    const openCsvImport = () => { setShowCsvImport(true); setShowForm(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const closeCsvImport = () => { setShowCsvImport(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };

    const handleFile = (file) => {
        if (!file) return;
        setCsvResult(null);
        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const rows = parseCSV(ev.target.result);
            setCsvRows(rows);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const onFileInput = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };

    // Drag & drop
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); };

    const handleCsvUpload = async () => {
        if (csvRows.length === 0) return;
        setCsvUploading(true);
        setCsvResult(null);
        try {
            const { data } = await bulkCreateComputers(csvRows);
            setCsvResult(data);
            fetchComputers();
        } catch (err) {
            const msg = err.response?.data?.detail || 'CSV yükleme hatası.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setCsvUploading(false); }
    };

    const removeCsvRow = (idx) => setCsvRows((r) => r.filter((_, i) => i !== idx));

    // ── Print handlers ───────────────────
    const toggleSelectMode = () => {
        if (selectMode) {
            setSelectMode(false);
            setSelectedIds(new Set());
        } else {
            setSelectMode(true);
            setShowForm(false);
            setShowCsvImport(false);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleToggleAll = (filtered) => {
        const allSelected = filtered.every((c) => selectedIds.has(c.id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((c) => c.id)));
        }
    };

    const handlePrint = () => {
        const selected = computers.filter((c) => selectedIds.has(c.id));
        if (selected.length === 0) return;

        const rows = selected.map((c) => `
            <tr>
                <td>${c.computer_name || '—'}</td>
                <td>${c.brand}</td>
                <td>${c.model}</td>
                <td>${c.serial_no}</td>
                <td>${c.specifications?.ram || '—'}</td>
                <td>${c.specifications?.cpu || '—'}</td>
                <td>${c.wifi_mac || '—'}</td>
                <td>${c.ethernet_mac || '—'}</td>
                <td>${c.tesis || '—'}</td>
                <td>${c.lokasyon || '—'}</td>
                <td>${c.status === 'ASSIGNED' ? (c.assigned_to || '—') : '—'}</td>
                <td>${c.status === 'STOCK' ? 'Stokta' : c.status === 'ASSIGNED' ? 'Zimmetli' : c.status}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html><head><meta charset="utf-8">
            <title>Bilgisayar Envanter Listesi</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; }
                h1 { font-size: 20px; margin-bottom: 4px; }
                .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600;
                     border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase;
                     letter-spacing: 0.05em; color: #475569; }
                td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) { background: #f8fafc; }
                .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; }
                @media print {
                    body { margin: 15px; }
                    .no-print { display: none !important; }
                }
            </style></head><body>
            <h1>Bilgisayar Envanter Listesi</h1>
            <p class="subtitle">Toplam ${selected.length} bilgisayar · Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
            <table>
                <thead><tr>
                    <th>PC Adı</th><th>Marka</th><th>Model</th><th>Seri No</th><th>RAM</th><th>CPU</th><th>Wi-Fi MAC</th><th>Ethernet MAC</th><th>Tesis</th><th>Lokasyon</th><th>Zimmetli</th><th>Durum</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">IT Envanter Takip Sistemi</div>
            </body></html>
        `;

        const printWin = window.open('', '_blank', 'width=900,height=600');
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); }, 300);
    };

    return (
        <div>
            <AppModal
                open={modal.open}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                details={modal.details}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
            />
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <button
                            onClick={() => navigate('/inventory')}
                            style={{
                                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)',
                                borderRadius: 10, padding: '7px 9px', cursor: 'pointer',
                                color: '#a5b4fc', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                            title="Envantere Dön"
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} />
                        </button>
                        <h2 className="page-title">
                            <span className="page-title-icon"><Monitor style={{ width: 18, height: 18 }} /></span>
                            Bilgisayarlar
                        </h2>
                    </div>
                    <p className="page-subtitle">Bilgisayar varlıklarını yönetin</p>
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

            {/* ── CSV Import Panel ────────────────── */}
            {showCsvImport && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 10px rgba(6,182,212,0.4)' }} />
                        CSV ile Toplu Bilgisayar Ekle
                    </h3>

                    {/* Drop zone */}
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(99,102,241,0.15)'}`,
                            borderRadius: 16,
                            padding: '40px 24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: isDragging ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.02)',
                            transition: 'all 0.25s',
                            marginBottom: 20,
                        }}
                    >
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={onFileInput} style={{ display: 'none' }} />
                        <FileSpreadsheet style={{ width: 36, height: 36, color: isDragging ? '#6366f1' : '#334155', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? '#a5b4fc' : '#94a3b8' }}>
                            {isDragging ? 'Dosyayı bırakın...' : 'CSV dosyasını sürükleyin veya tıklayın'}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                            Kolonlar: bilgisayar_adi, marka, model, seri_no, ram, cpu, durum
                        </p>
                    </div>

                    {/* File name & row count */}
                    {csvFileName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <FileSpreadsheet style={{ width: 16, height: 16, color: '#6366f1' }} />
                            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{csvFileName}</span>
                            <span style={{
                                fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                                background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                            }}>
                                {csvRows.length} kayıt
                            </span>
                        </div>
                    )}

                    {/* Preview table */}
                    {csvRows.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 12, border: '1px solid rgba(99,102,241,0.08)' }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>PC Adı</th>
                                        <th>Marka</th>
                                        <th>Model</th>
                                        <th>Seri No</th>
                                        <th>RAM</th>
                                        <th>CPU</th>
                                        <th>Durum</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvRows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#475569' }}>{i + 1}</td>
                                            <td style={{ color: '#a5b4fc' }}>{r.computer_name || '—'}</td>
                                            <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.brand}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.model}</td>
                                            <td style={{ fontFamily: 'monospace', color: '#64748b', letterSpacing: '0.04em' }}>{r.serial_no}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.specifications?.ram || '—'}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.specifications?.cpu || '—'}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.status}</td>
                                            <td>
                                                <button
                                                    onClick={() => removeCsvRow(i)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}
                                                >
                                                    <X style={{ width: 14, height: 14 }} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Quick Add Person (Optional for CSV) */}
                    {csvRows.length > 0 && (
                        <div style={{
                            background: 'rgba(99,102,241,0.04)',
                            border: '1px dashed rgba(99,102,241,0.2)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a5b4fc', marginBottom: 0 }}>
                                <span style={{ color: '#6366f1' }}>+</span> Hızlı Personel Ekle (Opsiyonel)
                            </label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    type="text"
                                    placeholder="Ad Soyad..."
                                    value={quickEmployeeName}
                                    onChange={(e) => setQuickEmployeeName(e.target.value)}
                                    className="input"
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddEmployee();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    onClick={handleQuickAddEmployee}
                                    loading={addingQuickEmployee}
                                    variant="secondary"
                                >
                                    Ekle
                                </Button>
                            </div>
                            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                                Birden fazla bilgisayar kaydederken aradaki zimmetleme işlemleriniz için ilgili personeli sisteme hızlıca kaydedebilirsiniz.
                            </p>
                        </div>
                    )}

                    {/* Result message */}
                    {csvResult && (
                        <div style={{
                            padding: '14px 20px', borderRadius: 12, marginBottom: 16,
                            background: csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                            border: `1px solid ${csvResult.skipped_count > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}`,
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                        }}>
                            {csvResult.skipped_count > 0 ? (
                                <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                            ) : (
                                <CheckCircle style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                            )}
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                    {csvResult.created_count} bilgisayar başarıyla eklendi
                                    {csvResult.skipped_count > 0 && `, ${csvResult.skipped_count} adet atlandı (tekrar eden seri no)`}
                                </p>
                                {csvResult.skipped_serials?.length > 0 && (
                                    <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                                        Atlanan: {csvResult.skipped_serials.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={closeCsvImport}>İptal</Button>
                        <Button icon={Upload} onClick={handleCsvUpload} loading={csvUploading} disabled={csvRows.length === 0}>
                            {csvRows.length} Bilgisayar Ekle
                        </Button>
                    </div>
                </div>
            )}

            {/* Single add/edit form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: editingId ? '#f59e0b' : '#10b981',
                            boxShadow: editingId ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(16,185,129,0.4)',
                        }} />
                        {editingId ? `Bilgisayar Düzenle — #${editingId}` : 'Yeni Bilgisayar Ekle'}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {fields.map((f) => (
                            <div key={f.name}>
                                <label className="form-label">{f.label}</label>
                                <input
                                    name={f.name}
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    value={f.name === 'ram' ? form.specifications.ram : f.name === 'cpu' ? form.specifications.cpu : form[f.name]}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                        ))}

                        {/* Quick Add Person */}
                        <div style={{
                            gridColumn: '1 / -1',
                            background: 'rgba(99,102,241,0.04)',
                            border: '1px dashed rgba(99,102,241,0.2)',
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a5b4fc', marginBottom: 0 }}>
                                <span style={{ color: '#6366f1' }}>+</span> Hızlı Personel Ekle
                            </label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    type="text"
                                    placeholder="Ad Soyad..."
                                    value={quickEmployeeName}
                                    onChange={(e) => setQuickEmployeeName(e.target.value)}
                                    className="input"
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleQuickAddEmployee();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    onClick={handleQuickAddEmployee}
                                    loading={addingQuickEmployee}
                                    variant="secondary"
                                >
                                    Ekle
                                </Button>
                            </div>
                            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                                Bilgisayar sahibini (personel) sisteme hızlıca kaydetmek için kullanabilirsiniz. Zimmet işlemi ayrıca yapılmalıdır.
                            </p>
                        </div>

                        {editingId && (
                            <div>
                                <label className="form-label">Durum</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '12px 16px', fontSize: 13, fontWeight: 500,
                                        color: '#e2e8f0', backgroundColor: 'rgba(8,12,28,0.8)',
                                        border: '1px solid rgba(99,102,241,0.08)', borderRadius: 12,
                                        outline: 'none', fontFamily: 'Inter, sans-serif', appearance: 'auto',
                                    }}
                                >
                                    {statusOptions.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Fault description toggle - only when editing */}
                        {editingId && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={hasFault}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setHasFault(checked);
                                                if (!checked) setForm((f) => ({ ...f, fault_description: '' }));
                                            }}
                                            style={{
                                                width: 18, height: 18, accentColor: '#f87171',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>Arıza Kaydı Var</span>
                                    </label>
                                </div>

                                {hasFault && (
                                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#f87171' }}>⚠</span> Arıza Açıklaması
                                        </label>
                                        <textarea
                                            name="fault_description"
                                            value={form.fault_description}
                                            onChange={handleChange}
                                            placeholder="Arızayı detaylandırın..."
                                            className="input"
                                            rows={2}
                                            style={{
                                                resize: 'vertical', minHeight: 48,
                                                fontFamily: 'Inter, sans-serif',
                                                borderColor: 'rgba(248,113,113,0.3)',
                                                background: 'rgba(248,113,113,0.04)'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={handleCancel} type="button">İptal</Button>
                        <Button type="submit" loading={saving} icon={editingId ? Save : Plus}>
                            {editingId ? 'Güncelle' : 'Kaydet'}
                        </Button>
                    </div>
                </form>
            )}

            <AssetTable
                computers={computers}
                onDelete={handleDelete}
                onEdit={openEdit}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
            />

            {/* ── Floating selection bar ────────────────── */}
            {selectMode && selectedIds.size > 0 && (
                <div style={{
                    position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 28px', borderRadius: 16,
                    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.1)',
                    zIndex: 100, animation: 'pageSlide 0.25s ease-out',
                }}>
                    <span style={{
                        fontSize: 13, fontWeight: 600, color: '#a5b4fc',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{
                            width: 24, height: 24, borderRadius: 8,
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff',
                        }}>{selectedIds.size}</span>
                        bilgisayar seçildi
                    </span>
                    <Button icon={Printer} onClick={handlePrint}>Seçilenleri Yazdır</Button>
                </div>
            )}
        </div>
    );
}
