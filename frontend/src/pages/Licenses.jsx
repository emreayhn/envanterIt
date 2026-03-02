/**
 * Page: Licenses — ekleme, düzenleme, silme + kullanıcıya atama.
 * Checkbox ile seçim, toplu atama, atanan kullanıcıları görüntüleme.
 */
import React, { useEffect, useState } from 'react';
import {
    Plus, X, KeyRound, AlertTriangle, Trash2, Edit, Save,
    UserPlus, ChevronDown, ChevronUp, User, Check,
} from 'lucide-react';
import useStore from '../store/useStore';
import Button from '../components/atoms/Button';
import AppModal from '../components/atoms/AppModal';
import SearchableSelect from '../components/molecules/SearchableSelect';
import {
    createLicense, updateLicense, deleteLicense,
    assignLicenses, getLicenseAssignments, unassignLicense, getEmployees,
} from '../services/api';

const emptyForm = {
    software_name: '', license_key: '', expiration_date: '',
    total_seats: 1, used_seats: 0,
};

const fields = [
    { name: 'software_name', label: 'Yazılım Adı', placeholder: 'Microsoft Office 365' },
    { name: 'license_key', label: 'Lisans Anahtarı', placeholder: 'XXXXX-XXXXX-XXXXX' },
    { name: 'expiration_date', label: 'Son Kullanım Tarihi', type: 'date' },
    { name: 'total_seats', label: 'Toplam Kullanıcı', type: 'number' },
    { name: 'used_seats', label: 'Aktif Kullanıcı', type: 'number' },
];

export default function Licenses() {
    const { licenses, fetchLicenses } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    // Selection
    const [selected, setSelected] = useState(new Set());

    // Assignment modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [assigning, setAssigning] = useState(false);

    // Expanded row — show assigned users
    const [expandedId, setExpandedId] = useState(null);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);

    // Modal state
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert', details: null, onConfirm: null });
    const closeModal = () => setModal((m) => ({ ...m, open: false }));

    useEffect(() => { fetchLicenses(); fetchAllAssignments(); }, []);

    const fetchAllAssignments = async () => {
        try {
            const { data } = await getLicenseAssignments();
            setAllAssignments(data);
        } catch { setAllAssignments([]); }
    };

    // ── Form handlers ────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({
            ...f, [name]: name === 'total_seats' || name === 'used_seats' ? Number(value) : value,
        }));
    };

    const openNew = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowForm(true);
    };

    const openEdit = (lic) => {
        setEditingId(lic.id);
        setForm({
            software_name: lic.software_name || '',
            license_key: lic.license_key || '',
            expiration_date: lic.expiration_date || '',
            total_seats: lic.total_seats ?? 1,
            used_seats: lic.used_seats ?? 0,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, expiration_date: form.expiration_date || null };
            if (editingId) {
                await updateLicense(editingId, payload);
            } else {
                await createLicense(payload);
            }
            setShowForm(false);
            setForm({ ...emptyForm });
            setEditingId(null);
            fetchLicenses();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Bir hata oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        const lic = licenses.find((l) => l.id === id);
        setModal({
            open: true,
            title: 'Lisans Sil',
            message: `"${lic?.software_name}" lisansını silmek istediğinize emin misiniz?`,
            type: 'confirm',
            details: null,
            onConfirm: async () => {
                closeModal();
                try {
                    await deleteLicense(id);
                    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
                    fetchLicenses();
                } catch (err) {
                    const msg = err.response?.data?.detail || 'Silme işlemi başarısız.';
                    setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
                }
            },
        });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
    };

    const isExpired = (date) => date && new Date(date) <= new Date();

    // ── Selection handlers ────────────────────
    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === licenses.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(licenses.map((l) => l.id)));
        }
    };

    const allSelected = licenses.length > 0 && selected.size === licenses.length;
    const someSelected = selected.size > 0 && selected.size < licenses.length;

    // ── Assignment handlers ────────────────────
    const openAssignModal = async () => {
        try {
            const { data } = await getEmployees();
            setEmployees(data);
        } catch { setEmployees([]); }
        setSelectedEmployees([]);
        setShowAssignModal(true);
    };

    const addEmployee = (empId) => {
        if (!empId || selectedEmployees.includes(Number(empId))) return;
        setSelectedEmployees((prev) => [...prev, Number(empId)]);
    };

    const removeEmployee = (empId) => {
        setSelectedEmployees((prev) => prev.filter((id) => id !== empId));
    };

    const handleAssign = async () => {
        if (selectedEmployees.length === 0 || selected.size === 0) return;
        setAssigning(true);
        try {
            await assignLicenses({
                license_ids: [...selected],
                employee_ids: selectedEmployees,
            });
            setShowAssignModal(false);
            setSelected(new Set());
            setSelectedEmployees([]);
            fetchLicenses();
            fetchAllAssignments();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Atama hatası oluştu.';
            setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
        }
        finally { setAssigning(false); }
    };

    // ── Expand row to see assigned users ────────────
    const toggleExpand = async (licId) => {
        if (expandedId === licId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(licId);
        // Filter from allAssignments
        setAssignedUsers(allAssignments.filter((a) => a.license_id === licId));
    };

    const handleUnassign = (assignmentId) => {
        setModal({
            open: true,
            title: 'Atama Kaldır',
            message: 'Bu atamayı kaldırmak istediğinize emin misiniz?',
            type: 'confirm',
            details: null,
            onConfirm: async () => {
                closeModal();
                try {
                    await unassignLicense(assignmentId);
                    fetchLicenses();
                    fetchAllAssignments();
                    setAssignedUsers((prev) => prev.filter((a) => a.id !== assignmentId));
                } catch (err) {
                    const msg = err.response?.data?.detail || 'İşlem başarısız.';
                    setModal({ open: true, title: 'Hata', message: msg, type: 'error', details: null, onConfirm: closeModal });
                }
            },
        });
    };

    // Get assignment count for a license
    const getAssignCount = (licId) => allAssignments.filter((a) => a.license_id === licId).length;

    // ── Checkbox style ────────────────────
    const checkboxStyle = (checked) => ({
        width: 18, height: 18, borderRadius: 5,
        border: `2px solid ${checked ? '#6366f1' : '#334155'}`,
        background: checked ? '#6366f1' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', flexShrink: 0,
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
                        <span className="page-title-icon"><KeyRound style={{ width: 18, height: 18 }} /></span>
                        Lisanslar
                    </h2>
                    <p className="page-subtitle">Yazılım lisanslarını yönetin ve kullanıcılara atayın</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {selected.size > 0 && (
                        <Button icon={UserPlus} onClick={openAssignModal}>
                            Seçilenleri Ata ({selected.size})
                        </Button>
                    )}
                    <Button icon={showForm ? X : Plus} onClick={showForm ? handleCancel : openNew}>
                        {showForm ? 'Kapat' : 'Yeni Ekle'}
                    </Button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: editingId ? '#f59e0b' : '#06b6d4',
                            boxShadow: editingId ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(6,182,212,0.4)',
                        }} />
                        {editingId ? `Lisans Düzenle — #${editingId}` : 'Yeni Lisans Ekle'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {fields.map((f) => (
                            <div key={f.name}>
                                <label className="form-label">{f.label}</label>
                                <input
                                    name={f.name}
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    value={form[f.name]}
                                    onChange={handleChange}
                                    className="input"
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

            {/* License Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>
                                <div
                                    onClick={toggleSelectAll}
                                    style={checkboxStyle(allSelected)}
                                >
                                    {(allSelected || someSelected) && (
                                        <Check style={{ width: 12, height: 12, color: '#fff' }} />
                                    )}
                                </div>
                            </th>
                            <th>Yazılım</th>
                            <th>Lisans Anahtarı</th>
                            <th>Son Kullanım</th>
                            <th>Kullanım</th>
                            <th>Atanan</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {licenses.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="empty-state">
                                        <KeyRound />
                                        <p>Henüz lisans eklenmedi.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            licenses.map((l) => {
                                const isExpanded = expandedId === l.id;
                                const assignCount = getAssignCount(l.id);
                                const licAssignments = allAssignments.filter((a) => a.license_id === l.id);
                                return (
                                    <React.Fragment key={l.id}>
                                        <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(l.id)}>
                                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <div
                                                    onClick={() => toggleSelect(l.id)}
                                                    style={checkboxStyle(selected.has(l.id))}
                                                >
                                                    {selected.has(l.id) && (
                                                        <Check style={{ width: 12, height: 12, color: '#fff' }} />
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {l.software_name}
                                                    {isExpanded ? (
                                                        <ChevronUp style={{ width: 14, height: 14, color: '#6366f1' }} />
                                                    ) : (
                                                        <ChevronDown style={{ width: 14, height: 14, color: '#475569' }} />
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', letterSpacing: '0.04em' }}>{l.license_key}</td>
                                            <td>
                                                {isExpired(l.expiration_date) ? (
                                                    <span className="badge badge-scrap">
                                                        <AlertTriangle style={{ width: 12, height: 12 }} />
                                                        {l.expiration_date}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{l.expiration_date || '—'}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div className="progress-bar" style={{ flex: 1, maxWidth: 100 }}>
                                                        <div className="progress-bar-fill" style={{ width: `${Math.min((l.used_seats / l.total_seats) * 100, 100)}%` }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                        {l.used_seats} / {l.total_seats}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {assignCount > 0 ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                        background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                    }}>
                                                        <User style={{ width: 11, height: 11 }} />
                                                        {assignCount} kişi
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: '#475569' }}>—</span>
                                                )}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => openEdit(l)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
                                                        <Edit style={{ width: 15, height: 15 }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(l.id)} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#f87171' }}>
                                                        <Trash2 style={{ width: 15, height: 15 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <div style={{
                                                        padding: '16px 28px',
                                                        background: 'rgba(99,102,241,0.02)',
                                                        borderTop: '1px solid rgba(99,102,241,0.06)',
                                                    }}>
                                                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <User style={{ width: 14, height: 14, color: '#6366f1' }} />
                                                            Atanan Kullanıcılar
                                                        </h4>
                                                        {licAssignments.length === 0 ? (
                                                            <p style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>Bu lisans henüz kimseye atanmadı.</p>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                                {licAssignments.map((a) => (
                                                                    <div key={a.id} style={{
                                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                                        padding: '8px 14px', borderRadius: 12,
                                                                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.08)',
                                                                    }}>
                                                                        <div style={{
                                                                            width: 28, height: 28, borderRadius: 8,
                                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: 11, fontWeight: 700, color: '#fff',
                                                                        }}>
                                                                            {(a.employee_name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{a.employee_name}</p>
                                                                            <p style={{ fontSize: 11, color: '#475569' }}>{a.assigned_date}</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleUnassign(a.id)}
                                                                            style={{
                                                                                marginLeft: 6, padding: 4, borderRadius: 6, border: 'none',
                                                                                background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
                                                                                display: 'flex', alignItems: 'center',
                                                                            }}
                                                                            title="Atamayı kaldır"
                                                                        >
                                                                            <X style={{ width: 12, height: 12 }} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => setShowAssignModal(false)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(145deg, #0f172a, #0b1120)',
                            border: '1px solid rgba(99,102,241,0.12)',
                            borderRadius: 20, padding: 32, width: '95%', maxWidth: 460,
                            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <UserPlus style={{ width: 18, height: 18, color: '#fff' }} />
                                </div>
                                Lisansları Ata
                            </h3>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                style={{
                                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)',
                                    borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8',
                                }}
                            >
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        {/* Selected licenses summary */}
                        <div style={{
                            marginBottom: 20, padding: '12px 16px', borderRadius: 12,
                            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)',
                        }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>
                                {selected.size} lisans seçildi:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {[...selected].map((id) => {
                                    const lic = licenses.find((l) => l.id === id);
                                    return lic ? (
                                        <span key={id} style={{
                                            padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                            background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                                        }}>
                                            {lic.software_name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>

                        {/* Employee selector */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                                    Personel Seçin (birden fazla seçebilirsiniz)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedEmployees.length === employees.length) {
                                            setSelectedEmployees([]);
                                        } else {
                                            setSelectedEmployees(employees.map((e) => e.id));
                                        }
                                    }}
                                    style={{
                                        background: 'none', border: '1px solid rgba(99,102,241,0.2)',
                                        borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                                        color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {selectedEmployees.length === employees.length ? 'Temizle' : 'Tümünü Seç'}
                                </button>
                            </div>
                            <SearchableSelect
                                options={employees
                                    .filter((e) => !selectedEmployees.includes(e.id))
                                    .map((e) => ({
                                        value: String(e.id),
                                        label: e.full_name,
                                        sub: e.department || e.email,
                                    }))}
                                value=""
                                onChange={addEmployee}
                                placeholder="Personel arayın..."
                            />
                        </div>

                        {/* Selected employee chips */}
                        {selectedEmployees.length > 0 && (
                            <div style={{
                                marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8,
                            }}>
                                {selectedEmployees.map((empId) => {
                                    const emp = employees.find((e) => e.id === empId);
                                    return emp ? (
                                        <span key={empId} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                                            background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                                            border: '1px solid rgba(99,102,241,0.2)',
                                        }}>
                                            <User style={{ width: 12, height: 12 }} />
                                            {emp.full_name}
                                            <button
                                                onClick={() => removeEmployee(empId)}
                                                style={{
                                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                                    color: '#f87171', display: 'flex', alignItems: 'center',
                                                }}
                                            >
                                                <X style={{ width: 12, height: 12 }} />
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>İptal</Button>
                            <Button
                                icon={UserPlus}
                                onClick={handleAssign}
                                loading={assigning}
                                disabled={selectedEmployees.length === 0}
                            >
                                {selectedEmployees.length > 0 ? `${selectedEmployees.length} Kişiye Ata` : 'Ata'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
