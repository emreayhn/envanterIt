/**
 * Page: Employees — personel ekleme, düzenleme, silme, CSV import (tablo görünümü + arama).
 */
import { useEffect, useState, useRef, Fragment } from 'react';
import { Plus, X, Users, Trash2, Search, MapPin, Phone, Briefcase, Building, Edit, Save, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, UserMinus, Monitor, Server, Printer, Package, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../store/useStore';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';
import { createEmployee, updateEmployee, deleteEmployee, bulkCreateEmployees, bulkDeleteUnassignedEmployees, getEmployeeAssignments, getCategories, getAssignments } from '../services/api';

const FIXED_TYPES = [
    { key: 'computer',  label: 'Bilgisayar', Icon: Monitor  },
    { key: 'kiosk',     label: 'Kiosk',       Icon: Server   },
    { key: 'printer',   label: 'Yazıcı',      Icon: Printer  },
];

function getItemLabel(a) {
    if (a.item_type === 'kiosk')         return { primary: a.kiosk_hostname || '—', secondary: a.kiosk_serial || '' };
    if (a.item_type === 'printer')       return { primary: a.printer_name || [a.printer_brand, a.printer_model].filter(Boolean).join(' ') || '—', secondary: a.printer_serial || '' };
    if (a.item_type === 'category_item') return { primary: a.item_name || [a.item_brand, a.item_model].filter(Boolean).join(' ') || '—', secondary: a.item_serial || '' };
    return { primary: a.computer_name || [a.computer_brand, a.computer_model].filter(Boolean).join(' ') || '—', secondary: a.computer_serial || '' };
}

/* ── CSV column mapping ──────────────────────────────── */
const HEADER_MAP = {
    'full_name': 'full_name', 'ad_soyad': 'full_name', 'ad soyad': 'full_name', 'personel_adi': 'full_name', 'display name': 'full_name',
    'email': 'email', 'e-posta': 'email', 'eposta': 'email', 'user principal name': 'email',
    'department': 'department', 'departman': 'department',
    'location': 'location', 'lokasyon': 'location', 'city': 'location',
    'phone': 'phone', 'telefon': 'phone', 'mobile phone': 'phone', 'phone number': 'phone',
    'company': 'company', 'firma': 'company', 'sirket': 'company', 'şirket': 'company',
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
        if (row.full_name && row.email) {
            rows.push({
                full_name: row.full_name,
                email: row.email,
                department: row.department || '',
                location: row.location || '',
                phone: row.phone || '',
                company: row.company || '',
            });
        }
    }
    return rows;
}

const emptyForm = { full_name: '', email: '', department: '', location: '', phone: '', company: '' };

const formFields = [
    { name: 'full_name', label: 'Ad Soyad', placeholder: 'Ahmet Yılmaz', required: true },
    { name: 'email', label: 'E-Posta', placeholder: 'ahmet@sirket.com', type: 'email', required: true },
    { name: 'department', label: 'Departman', placeholder: 'Bilgi Teknolojileri' },
    { name: 'company', label: 'Firma', placeholder: 'ABC Teknoloji' },
    { name: 'location', label: 'Lokasyon', placeholder: 'İstanbul - Merkez Ofis' },
    { name: 'phone', label: 'Telefon', placeholder: '+90 555 123 4567', type: 'tel' },
];

export default function Employees() {
    const { employees, fetchEmployees } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Assignment detail expand
    const [expandedId, setExpandedId] = useState(null);
    const [assignmentCache, setAssignmentCache] = useState({});
    const [categories, setCategories] = useState([]);
    const [loadingExpand, setLoadingExpand] = useState(false);
    // Tüm aktif zimmetler (tablo kolonları için)
    const [allAssignments, setAllAssignments] = useState([]);
    // Zimmet filtresi — seçili kolon key'leri (hepsi seçiliyse filtre yok)
    const [activeFilters, setActiveFilters] = useState(new Set());
    const toggleFilter = (key) => setActiveFilters((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });

    // CSV import state
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [csvRows, setCsvRows] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const tableScrollRef = useRef(null);
    const topScrollRef = useRef(null);
    const topInnerRef = useRef(null);

    useEffect(() => {
        const tableEl = tableScrollRef.current;
        if (!tableEl || !topInnerRef.current) return;
        const updateWidth = () => {
            if (topInnerRef.current) topInnerRef.current.style.width = tableEl.scrollWidth + 'px';
        };
        updateWidth();
        const ro = new ResizeObserver(updateWidth);
        ro.observe(tableEl);
        return () => ro.disconnect();
    });

    const syncFromTop = () => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft; };
    const syncFromTable = () => { if (topScrollRef.current) topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft; };

    // Modal state
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', details: null, onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    const refreshAssignments = () =>
        getAssignments().then((r) => setAllAssignments(r.data)).catch(() => {});

    useEffect(() => {
        fetchEmployees();
        getCategories().then((r) => setCategories(r.data)).catch(() => {});
        refreshAssignments();
    }, []);

    // empId -> { computer, kiosk, printer, cat_X } lookup
    const assignmentsByEmp = {};
    for (const a of allAssignments) {
        if (!assignmentsByEmp[a.employee_id]) assignmentsByEmp[a.employee_id] = {};
        const key = a.item_type === 'category_item' ? `cat_${a.item_category_id}` : a.item_type;
        assignmentsByEmp[a.employee_id][key] = a;
    }

    const handleRowClick = async (empId) => {
        if (expandedId === empId) { setExpandedId(null); return; }
        setExpandedId(empId);
        if (assignmentCache[empId]) return;
        setLoadingExpand(true);
        try {
            const { data } = await getEmployeeAssignments(empId);
            setAssignmentCache((c) => ({ ...c, [empId]: data }));
        } catch { setAssignmentCache((c) => ({ ...c, [empId]: [] })); }
        finally { setLoadingExpand(false); }
    };

    // CSV handlers
    const openCsvImport = () => { setShowCsvImport(true); setShowForm(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const closeCsvImport = () => { setShowCsvImport(false); setCsvRows([]); setCsvFileName(''); setCsvResult(null); };
    const handleCsvFile = (file) => {
        if (!file) return;
        setCsvResult(null); setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setCsvRows(parseCSV(ev.target.result));
        reader.readAsText(file, 'UTF-8');
    };
    const handleCsvUpload = async () => {
        if (csvRows.length === 0) return;
        setCsvUploading(true); setCsvResult(null);
        try {
            const { data } = await bulkCreateEmployees(csvRows);
            setCsvResult(data);
            fetchEmployees();
        } catch (err) {
            setModal({ open: true, title: 'Hata', message: err.response?.data?.detail || 'CSV yükleme hatası.', type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setCsvUploading(false); }
    };
    const removeCsvRow = (idx) => setCsvRows((r) => r.filter((_, i) => i !== idx));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const openNew = () => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); };

    const openEdit = (emp) => {
        setEditingId(emp.id);
        setForm({
            full_name: emp.full_name || '', email: emp.email || '',
            department: emp.department || '', location: emp.location || '',
            phone: emp.phone || '', company: emp.company || '',
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) await updateEmployee(editingId, form);
            else await createEmployee(form);
            setShowForm(false); setForm({ ...emptyForm }); setEditingId(null);
            fetchEmployees();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Bir hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        const emp = employees.find((e) => e.id === id);
        setModal({
            open: true,
            title: 'Personel Sil',
            message: `"${emp?.full_name}" adlı personeli silmek istediğinize emin misiniz? Bu kişiye ait zimmetler kaldırılacak ve bilgisayarlar stok durumuna düşecektir.`,
            type: 'confirm',
            details: null,
            onConfirm: async () => {
                closeModal();
                try {
                    const { data } = await deleteEmployee(id);
                    fetchEmployees();
                    // Show result if computers were affected
                    if (data?.affected_computers?.length > 0) {
                        setModal({
                            open: true,
                            title: 'Personel Silindi',
                            message: `"${data.employee_name}" silindi. Aşağıdaki bilgisayarlar stok durumuna düşürüldü:`,
                            type: 'success',
                            details: data.affected_computers,
                            onConfirm: closeModal,
                        });
                    }
                } catch (err) {
                    const msg = err.response?.data?.detail || 'Silme işlemi başarısız.';
                    setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
                }
            },
        });
    };

    const handleCancel = () => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); };

    const handleClearUnassigned = () => {
        setModal({
            open: true,
            title: 'Atanmamışları Temizle',
            message: 'Üzerinde aktif bilgisayar zimmeti OLMAYAN tüm personeller kalıcı olarak silinecek. Onaylıyor musunuz?',
            type: 'confirm',
            details: null,
            onConfirm: async () => {
                closeModal();
                try {
                    const { data } = await bulkDeleteUnassignedEmployees();
                    fetchEmployees();
                    setModal({
                        open: true,
                        title: 'İşlem Başarılı',
                        message: data.message,
                        type: 'success',
                        details: null,
                        onConfirm: closeModal,
                    });
                } catch (err) {
                    const msg = err.response?.data?.detail || 'Toplu silme başarısız.';
                    setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
                }
            },
        });
    };

    const filtered = employees.filter((emp) => {
        const q = search.toLowerCase();
        const matchesSearch = (
            emp.full_name?.toLowerCase().includes(q) ||
            emp.email?.toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q) ||
            (emp.company || '').toLowerCase().includes(q) ||
            (emp.location || '').toLowerCase().includes(q) ||
            (emp.phone || '').toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;
        if (activeFilters.size === 0) return true;
        const empMap = assignmentsByEmp[emp.id] || {};
        return [...activeFilters].every((key) => !!empMap[key]);
    });

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
                    <h2 className="page-title">
                        <span className="page-title-icon"><Users style={{ width: 18, height: 18 }} /></span>
                        Personel
                    </h2>
                    <p className="page-subtitle">Çalışanları yönetin ve zimmet atayın</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button icon={UserMinus} onClick={handleClearUnassigned} variant="secondary" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        Atanmamışları Temizle
                    </Button>
                    <Button icon={Upload} onClick={showCsvImport ? closeCsvImport : openCsvImport} variant={showCsvImport ? 'ghost' : undefined}>
                        {showCsvImport ? 'CSV Kapat' : 'CSV ile Ekle'}
                    </Button>
                    <Button icon={showForm ? X : Plus} onClick={showForm ? handleCancel : openNew}>
                        {showForm ? 'Kapat' : 'Yeni Ekle'}
                    </Button>
                </div>
            </div>

            {/* CSV Import */}
            {showCsvImport && (
                <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.4)' }} />
                        CSV ile Toplu Personel Ekle
                    </h3>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleCsvFile(e.dataTransfer.files[0]); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: `2px dashed ${isDragging ? '#8b5cf6' : 'rgba(139,92,246,0.15)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)', transition: 'all 0.25s', marginBottom: 20 }}
                    >
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={(e) => { handleCsvFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                        <FileSpreadsheet style={{ width: 36, height: 36, color: isDragging ? '#8b5cf6' : '#334155', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? '#c4b5fd' : '#94a3b8' }}>
                            {isDragging ? 'Dosyayı bırakın...' : 'CSV dosyasını sürükleyin veya tıklayın'}
                        </p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Kolonlar: full_name, email, department, phone</p>
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
                                <thead><tr><th>#</th><th>Ad Soyad</th><th>E-posta</th><th>Departman</th><th>Telefon</th><th></th></tr></thead>
                                <tbody>
                                    {csvRows.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#475569' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.full_name}</td>
                                            <td style={{ color: '#64748b', fontSize: 11 }}>{r.email}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.department || '—'}</td>
                                            <td style={{ color: '#94a3b8' }}>{r.phone || '—'}</td>
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
                                    {csvResult.created_count} personel başarıyla eklendi
                                    {csvResult.skipped_count > 0 && `, ${csvResult.skipped_count} adet atlandı (mevcut e-posta)`}
                                </p>
                                {csvResult.skipped_emails?.length > 0 && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Atlanan: {csvResult.skipped_emails.join(', ')}</p>}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(139,92,246,0.06)' }}>
                        <Button variant="ghost" onClick={closeCsvImport}>İptal</Button>
                        <Button icon={Upload} onClick={handleCsvUpload} loading={csvUploading} disabled={csvRows.length === 0}>{csvRows.length} Personel Ekle</Button>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: editingId ? '#f59e0b' : '#8b5cf6',
                            boxShadow: editingId ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(139,92,246,0.4)',
                        }} />
                        {editingId ? `Personel Düzenle — #${editingId}` : 'Yeni Personel Ekle'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {formFields.map((f) => (
                            <div key={f.name}>
                                <label className="form-label">{f.label}</label>
                                <input
                                    name={f.name} type={f.type || 'text'} placeholder={f.placeholder}
                                    value={form[f.name]} onChange={handleChange} className="input" required={f.required}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                        <Button variant="ghost" onClick={handleCancel} type="button">İptal</Button>
                        <Button type="submit" loading={saving} icon={editingId ? Save : Plus}>
                            {editingId ? 'Güncelle' : 'Kaydet'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Employee Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(99,102,241,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim, e-posta, departman, firma, lokasyon ile ara..." className="input" style={{ paddingLeft: 44 }} />
                    </div>
                    {/* Zimmet filtre butonları */}
                    {(FIXED_TYPES.length + categories.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Zimmet filtrele:</span>
                            {[
                                ...FIXED_TYPES.map(({ key, label, Icon }) => ({ key, label, Icon, color: '#6366f1' })),
                                ...categories.map((c) => ({ key: `cat_${c.id}`, label: c.name, Icon: Package, color: c.color || '#6366f1' })),
                            ].map(({ key, label, Icon, color }) => {
                                const active = activeFilters.has(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => toggleFilter(key)}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                                            border: active ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.07)',
                                            background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                                            color: active ? color : '#475569',
                                        }}
                                    >
                                        <Icon style={{ width: 12, height: 12 }} />
                                        {label}
                                    </button>
                                );
                            })}
                            {activeFilters.size > 0 && (
                                <button
                                    onClick={() => setActiveFilters(new Set())}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontFamily: 'Inter, sans-serif' }}
                                >
                                    <X style={{ width: 11, height: 11 }} /> Temizle
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Üst kaydırma çubuğu */}
                <div
                    ref={topScrollRef}
                    onScroll={syncFromTop}
                    style={{ overflowX: 'auto', overflowY: 'hidden', height: 12 }}
                >
                    <div ref={topInnerRef} style={{ height: 1 }} />
                </div>
                <div ref={tableScrollRef} onScroll={syncFromTable} style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ad Soyad</th>
                                <th>E-Posta</th>
                                <th>Departman</th>
                                <th>Firma</th>
                                <th>Lokasyon</th>
                                <th>Telefon</th>
                                {FIXED_TYPES.map(({ key, label, Icon }) => (
                                    <th key={key} style={{ whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                            <Icon style={{ width: 12, height: 12 }} />{label}
                                        </span>
                                    </th>
                                ))}
                                {categories.map((c) => (
                                    <th key={c.id} style={{ whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                            <Package style={{ width: 12, height: 12 }} />{c.name}
                                        </span>
                                    </th>
                                ))}
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7 + FIXED_TYPES.length + categories.length}><div className="empty-state"><Users /><p>{employees.length === 0 ? 'Henüz personel eklenmedi.' : 'Sonuç bulunamadı.'}</p></div></td></tr>
                            ) : (
                                filtered.map((emp) => {
                                    const isExpanded = expandedId === emp.id;
                                    const empAssignments = assignmentCache[emp.id] || [];
                                    const allCols = [
                                        ...FIXED_TYPES,
                                        ...categories.map((c) => ({ key: `cat_${c.id}`, label: c.name, Icon: Package, categoryId: c.id, color: c.color })),
                                    ];
                                    return (
                                        <Fragment key={emp.id}>
                                            <tr
                                                onClick={() => handleRowClick(emp.id)}
                                                style={{ cursor: 'pointer', background: isExpanded ? 'rgba(99,102,241,0.05)' : undefined }}
                                            >
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 12, fontWeight: 700, color: '#fff',
                                                        }}>
                                                            {emp.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{emp.full_name}</span>
                                                            {isExpanded
                                                                ? <ChevronUp style={{ width: 14, height: 14, color: '#6366f1' }} />
                                                                : <ChevronDown style={{ width: 14, height: 14, color: '#475569' }} />}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13, color: '#64748b' }}>{emp.email}</td>
                                                <td>{emp.department ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Building style={{ width: 12, height: 12, color: '#475569' }} />{emp.department}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                                <td>{emp.company ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Briefcase style={{ width: 12, height: 12, color: '#475569' }} />{emp.company}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                                <td>{emp.location ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><MapPin style={{ width: 12, height: 12, color: '#475569' }} />{emp.location}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                                <td>{emp.phone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Phone style={{ width: 12, height: 12, color: '#475569' }} />{emp.phone}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                                {/* Zimmet kolonları */}
                                                {(() => {
                                                    const empMap = assignmentsByEmp[emp.id] || {};
                                                    const allCols = [
                                                        ...FIXED_TYPES.map((t) => ({ colKey: t.key, isComputer: t.key === 'computer' })),
                                                        ...categories.map((c) => ({ colKey: `cat_${c.id}`, isComputer: false, color: c.color })),
                                                    ];
                                                    return allCols.map(({ colKey, isComputer, color }) => {
                                                        const a = empMap[colKey];
                                                        return (
                                                            <td key={colKey} style={{ textAlign: 'center' }}>
                                                                {a ? (
                                                                    isComputer ? (
                                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc' }}>
                                                                            {a.computer_name || [a.computer_brand, a.computer_model].filter(Boolean).join(' ') || '—'}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: color || '#10b981', fontSize: 14, fontWeight: 700 }}>✓</span>
                                                                    )
                                                                ) : (
                                                                    <span style={{ color: '#334155', fontSize: 12 }}>—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    });
                                                })()}
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button onClick={() => openEdit(emp)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><Edit style={{ width: 15, height: 15 }} /></button>
                                                        <button onClick={() => handleDelete(emp.id)} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}><Trash2 style={{ width: 15, height: 15 }} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7 + FIXED_TYPES.length + categories.length} style={{ padding: 0, background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                                                        {loadingExpand && !assignmentCache[emp.id] ? (
                                                            <div style={{ padding: '20px 24px', color: '#475569', fontSize: 13 }}>Yükleniyor...</div>
                                                        ) : (
                                                            <div style={{ padding: '16px 24px', display: 'flex', gap: 12, overflowX: 'auto' }}>
                                                                {allCols.map((col) => {
                                                                    const matched = empAssignments.find((a) => {
                                                                        if (col.categoryId) return a.item_type === 'category_item' && a.item_category_id === col.categoryId;
                                                                        return a.item_type === col.key;
                                                                    });
                                                                    const color = col.color || '#6366f1';
                                                                    const { primary, secondary } = matched ? getItemLabel(matched) : { primary: null, secondary: null };
                                                                    return (
                                                                        <div
                                                                            key={col.key}
                                                                            style={{
                                                                                minWidth: 150, maxWidth: 180, flexShrink: 0,
                                                                                borderRadius: 12, padding: '14px 16px',
                                                                                border: matched
                                                                                    ? `1px solid ${color}44`
                                                                                    : '1px solid rgba(255,255,255,0.04)',
                                                                                background: matched
                                                                                    ? `${color}10`
                                                                                    : 'rgba(255,255,255,0.02)',
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                                                <col.Icon style={{ width: 13, height: 13, color: matched ? color : '#334155', flexShrink: 0 }} />
                                                                                <span style={{ fontSize: 10, fontWeight: 700, color: matched ? color : '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                                    {col.label}
                                                                                </span>
                                                                            </div>
                                                                            {matched ? (
                                                                                <>
                                                                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>{primary}</p>
                                                                                    {secondary && <p style={{ fontSize: 10, color: '#64748b', margin: '3px 0 0', fontFamily: 'monospace' }}>{secondary}</p>}
                                                                                    <p style={{ fontSize: 10, color: '#475569', margin: '6px 0 0' }}>
                                                                                        {matched.assigned_date ? new Date(matched.assigned_date).toLocaleDateString('tr-TR') : ''}
                                                                                    </p>
                                                                                </>
                                                                            ) : (
                                                                                <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>—</p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {empAssignments.length === 0 && (
                                                                    <p style={{ fontSize: 13, color: '#475569', alignSelf: 'center', margin: 0 }}>Aktif zimmet yok.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
