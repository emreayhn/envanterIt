/**
 * Page: Employees — personel ekleme, düzenleme, silme (tablo görünümü + arama).
 */
import { useEffect, useState } from 'react';
import { Plus, X, Users, Trash2, Search, MapPin, Phone, Briefcase, Building, Edit, Save } from 'lucide-react';
import useStore from '../store/useStore';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';
import { createEmployee, updateEmployee, deleteEmployee } from '../services/api';

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

    // Modal state
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', details: null, onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    useEffect(() => { fetchEmployees(); }, []);

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

    const filtered = employees.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.full_name?.toLowerCase().includes(q) ||
            emp.email?.toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q) ||
            (emp.company || '').toLowerCase().includes(q) ||
            (emp.location || '').toLowerCase().includes(q) ||
            (emp.phone || '').toLowerCase().includes(q)
        );
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
                <Button icon={showForm ? X : Plus} onClick={showForm ? handleCancel : openNew}>
                    {showForm ? 'Kapat' : 'Yeni Ekle'}
                </Button>
            </div>

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
                <div style={{ padding: 20, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
                        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#334155' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim, e-posta, departman, firma, lokasyon ile ara..." className="input" style={{ paddingLeft: 44 }} />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ad Soyad</th>
                                <th>E-Posta</th>
                                <th>Departman</th>
                                <th>Firma</th>
                                <th>Lokasyon</th>
                                <th>Telefon</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><Users /><p>{employees.length === 0 ? 'Henüz personel eklenmedi.' : 'Sonuç bulunamadı.'}</p></div></td></tr>
                            ) : (
                                filtered.map((emp) => (
                                    <tr key={emp.id}>
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
                                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: '#64748b' }}>{emp.email}</td>
                                        <td>{emp.department ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Building style={{ width: 12, height: 12, color: '#475569' }} />{emp.department}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                        <td>{emp.company ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Briefcase style={{ width: 12, height: 12, color: '#475569' }} />{emp.company}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                        <td>{emp.location ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><MapPin style={{ width: 12, height: 12, color: '#475569' }} />{emp.location}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                        <td>{emp.phone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}><Phone style={{ width: 12, height: 12, color: '#475569' }} />{emp.phone}</span> : <span style={{ color: '#334155' }}>—</span>}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button onClick={() => openEdit(emp)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><Edit style={{ width: 15, height: 15 }} /></button>
                                                <button onClick={() => handleDelete(emp.id)} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}><Trash2 style={{ width: 15, height: 15 }} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
